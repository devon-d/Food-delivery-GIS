import {AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {
  Cartesian3,
  CesiumEvent,
  CesiumService,
  EditActions,
  EditModes,
  PolygonEditorObservable,
  PolygonsEditorService,
  PolylinesEditorComponent
} from 'angular-cesium';
import {DEFAULT_POLYGON_EDIT_OPTIONS, Util} from '../../util';
import {SurveyStoreService} from '../../services/survey-store.service';
import * as KeyCodes from '@angular/cdk/keycodes';
import {Subscription} from 'rxjs';
import {KeyboardService} from '../../../common/services/keyboard.service';

@Component({
  selector: 'app-polygon-layer',
  templateUrl: './polygon-layer.component.html',
  styleUrls: ['./polygon-layer.component.css'],
  providers: [PolygonsEditorService]
})
export class PolygonLayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() finishEvent = new EventEmitter<any>();
  private isDrawing = false;
  private editingSurveyId = null;
  private keyboardSubscription: Subscription;

  polygon$: PolygonEditorObservable;
  @ViewChild('polygonEditor') polygonEditor: PolylinesEditorComponent;

  constructor(private cesiumService: CesiumService,
              private surveyStore: SurveyStoreService,
              private polygonEditorService: PolygonsEditorService,
              private keyboardService: KeyboardService) {
  }

  ngOnInit(): void {
    this.keyboardSubscription = this.keyboardService.keydown.subscribe(e => {
      this.keyDownEvent(e);
    });
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.keyboardSubscription.unsubscribe();
  }

  keyDownEvent(event: KeyboardEvent): void {
    if (event.keyCode === KeyCodes.ESCAPE && this.isDrawing && this.editingSurveyId == null) {
      const poly = this.polygon$;
      if (poly && poly.getCurrentPoints().length >= 1) {
        // workaround for finishing segment without adding a point

        // first add a temporary point
        const points = poly.getCurrentPoints();
        const lastPoint = points[points.length - 1];
        const newPos = Cesium.Cartesian3.add(lastPoint.getPosition(), new Cesium.Cartesian3(10, 10, 1), new Cesium.Cartesian3());
        // adds point and finish drawing
        this.finishCreation(newPos);
      }
    }
  }

  startDrawing(surveyId?: string): void {
    // start drawing
    if (!this.isDrawing) {
      if (surveyId) {
        this.editingSurveyId = surveyId;
        const polyPositions = this.surveyStore.getSurvey(surveyId).getPolygonPositions();
        this.polygon$ = this.polygonEditorService.edit(polyPositions, DEFAULT_POLYGON_EDIT_OPTIONS);
      } else {
        this.polygon$ = this.polygonEditorService.create(DEFAULT_POLYGON_EDIT_OPTIONS);
      }
      this.isDrawing = true;
    }
  }

  stopDrawing(): void {
    // stop drawing
    if (this.isDrawing) {
      const points = this.polygon$.getCurrentPoints();
      if (points.length > 2) {
        const positions = this.polygon$.getCurrentPoints().map(point => point.getPosition());
        if (this.editingSurveyId) {
          this.surveyStore.setSurveyBounds(this.editingSurveyId, positions);
          this.editingSurveyId = null;
        } else {
          this.surveyStore.addSurvey(positions, null, []);
        }
      }
      this.polygon$.dispose();
      this.isDrawing = false;
    }
  }

  async flyToPolygons(): Promise<void> {
    const enclosedPositions = [];
    this.surveyStore.surveys.forEach((survey) => enclosedPositions.push(...survey.getPolygonPositions()));
    if (enclosedPositions.length > 0) {
      const camera = this.cesiumService.getViewer().camera;
      const boundingSphere = new Cesium.BoundingSphere.fromPoints(enclosedPositions);
      const positions = await Util.updateHeights([boundingSphere.center], this.cesiumService.getViewer().terrainProvider);
      boundingSphere.center = positions[0];
      await camera.flyToBoundingSphere(boundingSphere, {
        duration: 1,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90.0), 0)
      });
    }
  }

  // work-around to manually finish creation without actually double-click on map
  private finishCreation(position: Cartesian3): void {
    if (position == null) {
      return;
    }

    // add manual point first
    const movement = Util.cartesianToMovement(this.cesiumService.getScene(), position);
    const leftClickAction = this.cesiumService.getViewer().screenSpaceEventHandler.getInputAction(CesiumEvent.LEFT_CLICK);
    if (movement != null) {
      leftClickAction(movement);
    }

    // finish with double click
    const doubleClickAction = this.cesiumService.getViewer().screenSpaceEventHandler.getInputAction(CesiumEvent.LEFT_DOUBLE_CLICK);
    if (movement != null) {
      doubleClickAction(movement);
    }

    // then remove the last added point
    const points = this.polygon$.getCurrentPoints();
    const lastPoint = points[points.length - 1];
    this.polygonEditor.handleEditUpdates({
      editAction: EditActions.REMOVE_POINT,
      editMode: EditModes.CREATE_OR_EDIT,
      updatedPoint: lastPoint,
      id: lastPoint.getEditedEntityId()
    });
    this.finishEvent?.emit();
  }
}
