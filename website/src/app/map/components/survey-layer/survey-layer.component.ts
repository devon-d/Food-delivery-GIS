import {AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import * as KeyCodes from '@angular/cdk/keycodes';

import {
  AcLayerComponent,
  AcNotification,
  ActionType,
  CesiumService,
  EditActions, EditPoint,
  PointEditorObservable,
  PointEditUpdate,
  PointsEditorComponent,
  PointsEditorService,
} from 'angular-cesium';
import {Subject, Subscription} from 'rxjs';
import {SurveyArea} from '../../models/survey-area';
import {OSMBuilding} from '../../models/osm-building';
import {v4 as uuidv4} from 'uuid';
import {SurveyStoreService, BuildingActionType, SurveyActionType} from '../../services/survey-store.service';
import {Util} from '../../util';
import {AdjustmentDialogComponent, PointOffset} from '../adjustment-dialog/adjustment-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ShapeMenuComponent, ShapeMenuEvent} from '../shape-menu/shape-menu.component';
import {MouseEvents} from '../../models/mouse-events';
import {ProjectSettingsService} from '../../services/project-settings.service';
import {AlertDialogComponent} from '../../../common/alert-dialog/alert-dialog.component';
import {BuildingsService} from '../../services/buildings.service';
import {PolygonEntity} from '../../models/polygon-entity';
import {PolygonLayerComponent} from '../polygon-layer/polygon-layer.component';
import {KeyboardService} from '../../../common/services/keyboard.service';

export type HighlightPointProps = {
  position: any,
  heightReference: number
};

@Component({
  selector: 'app-survey-layer',
  templateUrl: './survey-layer.component.html',
  styleUrls: ['./survey-layer.component.css'],
  providers: [PointsEditorService]
})
export class SurveyLayerComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() survey: SurveyArea;

  @Input() mouseEvents: MouseEvents;

  @Input() set enablePolygonMenu(enable: boolean) {
    if (enable !== this.showPolygonMenu) {
      this.showPolygonMenu = enable;
    }
  }

  @Input() set editablePoints(editable: boolean) {
    if (editable !== this.editingPoints) {
      if (editable) {
        this.subscribePointMouseEvents();
      } else {
        this.updateFocusPoint(null);
        this.pointMouseSubscriptions?.unsubscribe();
      }
      this.editingPoints = editable;
    }
  }

  @Input() set editablePolygon(editable: boolean) {
    if (editable !== this.editingPolygon && !this.surveyStore.isPlaceholderSurvey(this.survey.id)) {
      this.editingPolygon = editable;
      if (!editable) {
        this.stopPolygonEditing();
      }
    }
  }

  @Input() set show(visible: boolean) {
    if (this.visible !== visible) {
      if (visible) {
        this.createPolygon();
        this.createBuildingPoints(this.survey.getBuildings());
      } else {
        this.pointsLayer?.removeAll();
        this.deleteEditablePoint();
        this.deletePolygon();
      }
      this.visible = visible;
    }
  }

  Cesium = Cesium;
  pointContextItems = ['Adjust position...'];
  polygonContextItems = ['Query From OSM', 'Query From OpenAddresses', 'Delete'];
  tPolygonEntity = PolygonEntity;
  showPolygonMenu = false;
  editingPoints = false;
  editingPolygon = false;
  enablePolygonEditor = false;
  visible = false;

  point$?: PointEditorObservable;
  pointHighlightProps: HighlightPointProps;
  private polygonEditor: PolygonLayerComponent;
  @ViewChild('pointEditor') pointEditor: PointsEditorComponent;
  @ViewChild('pointsLayer') pointsLayer: AcLayerComponent;
  @ViewChild('pointShapeMenu') pointMenu: ShapeMenuComponent;
  @ViewChild('polygonShapeMenu') polygonMenu: ShapeMenuComponent;

  @ViewChild('polygonEditor') set content(content: PolygonLayerComponent) {
    if (content) { // initially setter gets called with undefined
      this.polygonEditor = content;
      this.startPolygonEditing();
    }
  }

  private buildingsNotifications$ = new Subject<AcNotification>();
  private polygons$ = new Subject<AcNotification>();
  // private highlights$ = new Subject<AcNotification>();
  private keyboardSubscription: Subscription;
  private pointMouseSubscriptions: Subscription;
  private polygonMouseSubscriptions: Subscription;
  private scene: any;
  private camera: any;
  private highlightedBuildings = [];
  private showFlightAltitude = false;

  constructor(private cesiumService: CesiumService,
              private pointsService: PointsEditorService,
              private surveyStore: SurveyStoreService,
              private buildingsService: BuildingsService,
              private dialog: MatDialog,
              private keyboardService: KeyboardService,
              public settingsService: ProjectSettingsService) {
  }

  ngOnInit(): void {
    this.scene = this.cesiumService.getScene();
    this.camera = this.scene.camera;

    // survey actions observer
    this.surveyStore.surveyAction$.subscribe((action) => {
      const actionType = action.type;
      const survey = action.payload;
      if (survey.id !== this.survey.id) {
        return;
      }
      switch (actionType) {
        case SurveyActionType.UPDATE_POLYGON: {
          this.createPolygon();
          break;
        }
        case SurveyActionType.CREATE_BUILDINGS: {
          this.pointsLayer.removeAll();
          this.deleteEditablePoint();
          this.createBuildingPoints(survey.getBuildings());
          break;
        }
        case SurveyActionType.TOGGLE_LOCK: {
          // helps changing color of linked and locked building
          survey.getBuildings()?.forEach(building => {
            this.createOrUpdateNonEditablePoint(building);
          });
          break;
        }
      }
    });

    // building actions observer
    this.surveyStore.buildingAction$.subscribe((action) => {
      const actionType = action.type;
      const building = action.payload;
      if (building?.surveyId !== this.survey.id) {
        return;
      }

      switch (actionType) {
        case BuildingActionType.CREATE: {
          this.createOrUpdateNonEditablePoint(building);
          break;
        }
        case BuildingActionType.DELETE: {
          this.deleteNonEditablePoint(building);
          break;
        }
        case BuildingActionType.FOCUS: {
          const cartesian = Util.locationToCartesian3(building.center);

          if (!building.locked && this.editingPoints) {
            // hide non-editable point for focused entity
            this.deleteNonEditablePoint(building);
            // show editable point for focused entity
            this.createEditablePoint(building);
          } else {
            this.createOrUpdateNonEditablePoint(building, true);
          }

          if (action.zoom) {
            Util.updateHeights([cartesian], this.cesiumService.getViewer().terrainProvider).then((positions) => {
              this.camera.flyToBoundingSphere(new Cesium.BoundingSphere(positions[0]), {
                duration: 0.5,
                offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90.0), 0)
              });
            });
          }
          break;
        }
        case BuildingActionType.UNFOCUS: {
          this.pointHighlightProps = null;
          this.deleteEditablePoint();
          this.createOrUpdateNonEditablePoint(building);
          break;
        }
        case BuildingActionType.UPDATE_NETWORK_LINK:
        case BuildingActionType.TOGGLE_LOCK: {
          // helps changing color of linked and locked building
          this.createOrUpdateNonEditablePoint(building);
          break;
        }
      }
    });

    // listen for settings change
    this.settingsService.settingsUpdate$.subscribe(settings => {
      this.showFlightAltitude = settings.show_flight_altitude;
      this.pointsLayer.removeAll();
      this.deleteEditablePoint();
      this.createBuildingPoints(this.survey.getBuildings());
    });

    this.keyboardSubscription = this.keyboardService.keydown.subscribe(e => {
      this.keyDownEvent(e);
    });

    this.subscribePolygonMouseEvents();
  }

  ngAfterViewInit(): void {
    if (this.visible) {
      this.createPolygon();
      this.createBuildingPoints(this.survey.getBuildings());
    }
  }

  ngOnDestroy(): void {
    this.deleteBuildingPoints(this.survey.getBuildings());
    this.pointMouseSubscriptions?.unsubscribe();
    this.polygonMouseSubscriptions?.unsubscribe();
    this.keyboardSubscription?.unsubscribe();
  }

  addHighlights(nodeIds: number[]): void {
    this.removeHighlights();
    const buildings = this.surveyStore.getBuildingsByGCSIds(this.survey.id, nodeIds);
    buildings.forEach(building => {
      this.createOrUpdateNonEditablePoint(building, true);
    });
    this.highlightedBuildings = buildings;
  }

  removeHighlights(): void {
    this.highlightedBuildings.forEach(building => {
      this.createOrUpdateNonEditablePoint(building, false);
    });
    this.highlightedBuildings = [];
  }

  private keyDownEvent(event: KeyboardEvent): void {
    const focusedBuilding = this.surveyStore.getFocusedBuilding();
    if (focusedBuilding?.surveyId !== this.survey.id) {
      return;
    }

    if (event.keyCode === KeyCodes.LEFT_ARROW) {
      const building = this.survey.getPreviousBuilding(focusedBuilding);
      this.updateFocusPoint(building, true);
    } else if (event.keyCode === KeyCodes.RIGHT_ARROW) {
      const building = this.survey.getNextBuilding(focusedBuilding);
      this.updateFocusPoint(building, true);
    } else if (event.shiftKey && event.keyCode === KeyCodes.ENTER) {
      this.unlockFocusedPoint();
      this.updateFocusPoint(focusedBuilding, false);
    } else if (event.keyCode === KeyCodes.ENTER) {
      console.log('focused: ', focusedBuilding);
      const building = this.survey.getNextBuilding(focusedBuilding, true);
      console.log('newbuild: ', building);
      this.lockFocusedPoint();
      this.updateFocusPoint(building, true);
    } else if (event.keyCode === KeyCodes.SPACE) {
      this.lockFocusedPoint();
      this.updateFocusPoint(focusedBuilding, false);
    }
  }

  private subscribePointMouseEvents(): void {
    const mEvent = this.mouseEvents;
    let dragging = false;
    this.pointMouseSubscriptions?.unsubscribe();

    // With combination of LeftDown, MouseMove, and LeftUp, focus and drag happens in single click.
    // Further drag events are handled by editable point itself

    // register focus event for buildings
    const leftDown = mEvent.leftDown.subscribe((result) => {
      // check if event belongs to entity from this survey
      if (result.entities && result.entities.length > 0 && result.entities[0].building && this.survey.id === result.entities[0].surveyId) {
        if (!result.entities[0].building.locked) {
          dragging = true;
          this.scene.screenSpaceCameraController.enableInputs = false;
        }
        this.updateFocusPoint(result.entities[0].building, false);
      }
    });

    // drag current editable point
    const mouseMove = mEvent.mouseMove.subscribe((result) => {
      if (dragging && this.point$) {
        const ray = this.camera.getPickRay(result.movement.startPosition);
        const updatedPosition = this.scene.globe.pick(ray, this.scene);
        this.point$.getCurrentPoint().setPosition(updatedPosition);
      }
    });

    // stops dragging current editable point
    const leftUp = mEvent.leftUp.subscribe((_) => {
      this.scene.screenSpaceCameraController.enableInputs = true;
      if (dragging && this.point$) {
        dragging = false;
        const focusedBuildingId = this.surveyStore.getFocusedBuilding()?.uuid;
        const updatedPosition = this.point$.getCurrentPoint().getPosition();
        const flightAlt = this.surveyStore.getFocusedBuilding().flightAltitude;
        this.surveyStore.updateBuildingPosition(this.survey.id, focusedBuildingId, updatedPosition, flightAlt);
      }
    });

    const leftCtrlClick = mEvent.leftCtrlClick.subscribe((result) => {
      // exit if this is not a placeholder survey OR if user is adding point over an existing building
      if (!this.surveyStore.isPlaceholderSurvey(this.survey.id) ||
        (result?.entities !== null && (result.entities[0].building instanceof OSMBuilding || result.entities[0] instanceof EditPoint))) {
        return;
      }
      const ray = this.camera.getPickRay(result.movement.startPosition);
      const position = this.scene.globe.pick(ray, this.scene);
      const building = new OSMBuilding({
        id: -1,
        uuid: uuidv4(),
        surveyId: this.survey.id,
        center: Util.cartesian3ToLocation(position),
        gcsId: this.surveyStore.getNodeCount()
      });
      this.surveyStore.addBuilding(this.survey.id, building);
      this.updateFocusPoint(building);
    });

    const rightCtrlClick = mEvent.rightCtrlClick.subscribe((result) => {
      // check if event belongs to entity from this survey
      if (result.entities && result.entities.length > 0 && result.entities[0].building && this.survey.id === result.entities[0].surveyId) {
        this.surveyStore.deleteBuilding(this.survey.id, result.entities[0].building.uuid);
      }
    });

    const rightClick = mEvent.rightClick.subscribe((result) => {
      if (result.entities == null || result.entities.length === 0) {
        return;
      }
      if (result.entities[0].building && this.survey.id === result.entities[0].surveyId) {
        this.pointMenu.open(result.movement, result.entities[0]);
      } else if (result.entities[0] instanceof EditPoint
        && this.point$?.getCurrentPoint().getId() === result.entities[0].getId()) {
        this.pointMenu.open(result.movement, result.entities[0]);
      }
    });

    // save subscriptions
    this.pointMouseSubscriptions = new Subscription();
    this.pointMouseSubscriptions.add(leftDown).add(mouseMove).add(leftUp).add(leftCtrlClick).add(rightCtrlClick).add(rightClick);
  }

  private subscribePolygonMouseEvents(): void {
    const mEvent = this.mouseEvents;
    this.polygonMouseSubscriptions?.unsubscribe();

    const rightClick = mEvent.rightClick.subscribe((result) => {
      if (result.entities == null || result.entities.length === 0 || !this.showPolygonMenu) {
        return;
      }
      if (result.entities[0] instanceof PolygonEntity && result.entities[0].id === this.survey.id) {
        this.polygonMenu.open(result.movement, result.entities[0]);
      }
    });

    const leftCtrlClick = mEvent.leftCtrlClick.subscribe((result) => {
      if (result.entities == null || result.entities.length === 0 || !this.editingPolygon) {
        return;
      }
      if (result.entities[0] instanceof PolygonEntity && result.entities[0].id === this.survey.id) {
        this.enablePolygonEditor = true;
      }
    });

    // save subscriptions
    this.polygonMouseSubscriptions = new Subscription();
    this.polygonMouseSubscriptions.add(rightClick).add(leftCtrlClick);
  }

  private updateFocusPoint(building: OSMBuilding, zoomOnFocus = false): void {
    // update focused entity
    this.surveyStore.setFocusedBuilding(building, zoomOnFocus);
  }

  private lockFocusedPoint(): void {
    const focusedBuilding = this.surveyStore.getFocusedBuilding();
    if (focusedBuilding?.surveyId === this.survey.id) {
      this.surveyStore.lockBuildingPosition(this.survey.id, focusedBuilding.uuid);
    }
  }

  private unlockFocusedPoint(): void {
    const focusedBuilding = this.surveyStore.getFocusedBuilding();
    if (focusedBuilding?.surveyId === this.survey.id) {
      this.surveyStore.unlockBuildingPosition(this.survey.id, focusedBuilding.uuid);
    }
  }

  private createEditablePoint(building: OSMBuilding): void {
    let position = Util.locationToCartesian3(building.center);
    this.pointHighlightProps = {
      position: new Cesium.CallbackProperty(() => position, false),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    };
    this.point$ = this.pointsService.edit(position, {
      allowDrag: false,
      pointProps: {
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
    this.point$.subscribe((editUpdate: PointEditUpdate) => {
      if (editUpdate.editAction === EditActions.DRAG_POINT_FINISH) {
        this.surveyStore.updateBuildingPosition(this.survey.id, building.uuid, editUpdate.position, building.flightAltitude);
      } else if (editUpdate.editAction === EditActions.DRAG_POINT) {
        position = editUpdate.position;
      }
    });
  }

  private deleteEditablePoint(): void {
    this.point$?.dispose();
    this.point$ = null;
  }

  private deleteNonEditablePoint(building: OSMBuilding): void {
    const notification: AcNotification = {
      id: building.uuid,
      actionType: ActionType.DELETE,
    };
    this.buildingsNotifications$.next(notification);
  }

  private createOrUpdateNonEditablePoint(building: OSMBuilding, highlight: boolean = false): void {
    const settings = this.settingsService.settings;
    let position = Cesium.Cartesian3.fromDegrees(building.center.lon, building.center.lat);
    let color;
    if (building.locked && building.linkPositions) {
      color = Cesium.Color.GREEN;
    } else if (building.locked) {
      color = Cesium.Color.GREY;
    } else {
      color = Cesium.Color.ALICEBLUE;
    }
    if (settings?.show_flight_altitude) {
      const altitude = building.flightAltitude || settings.flight_altitude_m || 0;
      position = Cesium.Cartesian3.fromDegrees(building.center.lon, building.center.lat, altitude);
    }
    if (highlight) {
      this.pointHighlightProps = {
        position: new Cesium.CallbackProperty(() => position, false),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      };
    }
    const notification: AcNotification = {
      id: building.uuid,
      actionType: ActionType.ADD_UPDATE,
      entity: {
        id: building.uuid,
        position,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        surveyId: this.survey.id,
        highlightColor: Cesium.Color.RED.withAlpha(0.5),
        color,
        building,
        highlight
      }
    };
    this.buildingsNotifications$.next(notification);
  }

  private deleteBuildingPoints(buildings?: OSMBuilding[]): void {
    // map to notifications
    buildings?.forEach((building) => {
      this.deleteNonEditablePoint(building);
    });
  }

  private createBuildingPoints(buildings?: OSMBuilding[]): void {
    // map to notifications
    buildings?.forEach((building) => {
      this.createOrUpdateNonEditablePoint(building);
    });
  }

  private createPolygon(): void {
    this.polygons$.next({
      id: this.survey.id,
      actionType: ActionType.ADD_UPDATE,
      entity: new PolygonEntity({
        id: this.survey.id,
        hierarchy: this.survey.getPolygonPositions()
      })
    });
  }

  private deletePolygon(): void {
    this.polygons$.next({
      id: this.survey.id,
      actionType: ActionType.DELETE
    });
  }

  private startPolygonEditing(): void {
    if (this.polygonEditor) {
      this.polygonEditor.startDrawing(this.survey.id);
      this.deletePolygon();
    }
  }

  private stopPolygonEditing(): void {
    if (this.polygonEditor) {
      this.polygonEditor.stopDrawing();
      this.polygonEditor = null;
      this.enablePolygonEditor = false;
    }
  }

  onPointMenuItemClick(event: ShapeMenuEvent): void {
    const shape = event.editableShape;
    let building: OSMBuilding = null;
    if (event.itemIndex === 0 && shape instanceof EditPoint) {
      building = this.surveyStore.getFocusedBuilding();
    } else {
      building = shape.building;
    }
    AdjustmentDialogComponent.show(this.dialog, this.cesiumService, {
      location: building.center,
      altitude: building.flightAltitude,
      globalAltitude: this.settingsService.settings.flight_altitude_m
    }).subscribe((result: PointOffset) => {
      if (result) {
        const cart = Util.locationToCartesian3(result.location);
        const updatedBuilding = this.surveyStore.updateBuildingPosition(this.survey.id, building.uuid, cart, result.altitude);
        this.createOrUpdateNonEditablePoint(updatedBuilding, true);
        this.updateFocusPoint(building, false);
      }
    });
  }

  onPolygonMenuItemClick(event: ShapeMenuEvent): void {
    // TODO: write a common code for show/query/delete polygon
    if (event.itemIndex === 0 || event.itemIndex === 1) { // Query
      const polygonEntity: PolygonEntity = event.editableShape;
      const survey = this.surveyStore.getSurvey(polygonEntity.id);
      const query = () => {
        const poly = event.itemIndex === 0 ? Util.getPolyForOSM(survey.getPolygonPositions()) :
          Util.getPolyForPostGIS(survey.getPolygonPositions());
        this.buildingsService.mode = event.itemIndex === 0 ? 'overpass' : 'open-addresses';
        this.buildingsService.fetchBuildings(poly, survey.id).subscribe((response) => {
          this.surveyStore.setBuildings(survey.id, response.elements);
        }, (error) => console.log(error));
      };
      if (survey.getBuildings()?.length > 0) {
        AlertDialogComponent.show(this.dialog, {
          title: 'Are you sure?',
          msg: 'This action will delete current building points of the polygon and create new ones',
          positiveText: 'Query',
          negativeText: 'Cancel'
        }).subscribe(positive => {
          if (positive) {
            query();
          }
        });
      } else {
        query();
      }
    } else if (event.itemIndex === 2) { // Delete
      AlertDialogComponent.show(this.dialog, {
        title: 'Are you sure?',
        msg: 'This action will delete the polygon and the building points associated with it',
        positiveText: 'Delete',
        negativeText: 'Cancel'
      }).subscribe(positive => {
        console.log(positive);
        if (positive) {
          this.surveyStore.deleteSurvey(event.shapeId);
        }
      });
    }
  }
}
