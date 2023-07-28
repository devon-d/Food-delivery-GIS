import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {
  AcEntity,
  AcLayerComponent,
  AcNotification,
  ActionType,
  Cartesian3,
  CesiumEvent,
  CesiumEventModifier,
  CesiumService,
  EditActions,
  EditModes,
  EditPoint, LabelProps,
  PickOptions,
  PolylineEditOptions,
  PolylineEditorObservable,
  PolylineEditUpdate,
  PolylinesEditorComponent,
  PolylinesEditorService
} from 'angular-cesium';
import {Subject, Subscription} from 'rxjs';
import {Util} from '../../util';
import * as turf from '@turf/turf';
import {BuildingActionType, SurveyActionType, SurveyStoreService} from '../../services/survey-store.service';
import {OSMBuilding} from '../../models/osm-building';
import * as KeyCodes from '@angular/cdk/keycodes';
import {v4 as uuidv4} from 'uuid';
import {INetwork, INodeProps} from '../../../project/models/project';
import {ShapeMenuComponent, ShapeMenuEvent} from '../shape-menu/shape-menu.component';
import {createNetworkEdge, createNetworkNode, findNodeProps, findNodeWithLatLng, isCloseTo, sortSegmentNodes} from './util';
import {DrawingState} from './models/drawing-state';
import {ManualPoint} from './models/manual-point';
import {NetworkMouseEvents} from './models/network-mouse-events';
import {BuildingLink, LineSegment} from './models/line-segment';
import {GcsNetwork, NetworkEdge, NetworkNode} from './models/gcs-network';
import {NodeType} from './models/node-type';
import {LoaderService} from '../../../loader.service';
import {AdjustmentDialogComponent, PointOffset} from '../adjustment-dialog/adjustment-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {MouseEvents} from '../../models/mouse-events';
import {ProjectSettingsService} from '../../services/project-settings.service';
import {last} from '../../../common/util/util';
import {Cartographic} from 'cesium';
import {KeyboardService} from '../../../common/services/keyboard.service';
import {PathFinder} from './path-finder';

@Component({
  selector: 'app-network-layer',
  templateUrl: './network-layer.component.html',
  styleUrls: ['./network-layer.component.css'],
  providers: [PolylinesEditorService]
})
export class NetworkLayerComponent implements OnInit, OnDestroy {
  Cesium = Cesium;
  private DEFAULT_POLYLINE_PROPS: PolylineEditOptions = {
    clampHeightTo3D: true,
    clampHeightTo3DOptions: {
      clampToTerrain: true, // Default: false (if true will only clamp to terrain)
      clampMostDetailed: true,
      clampToHeightPickWidth: 1
    },
    polylineProps: {
      width: 5
    },
    pointProps: {
      outlineColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.999),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.5),
      heightReference: Cesium.HeightReference.NONE,
      pixelSize: 25,
    },
    removePointEvent: CesiumEvent.RIGHT_CLICK,
    removePointModifier: CesiumEventModifier.CTRL,
  };
  private isDrawing = false;
  private isEditing = false;
  private state: DrawingState;
  private polylines$: PolylineEditorObservable[] = [];
  private keyboardSubscription: Subscription;
  private polylineSubscriptions: Subscription[] = [];
  private mouseSubscriptions: Subscription[] = [];
  private manualPoints: ManualPoint[] = [];
  private networks$ = new Subject<AcNotification>();
  private links$ = new Subject<AcNotification>();
  private highlightNotifications: AcNotification[] = [];
  private highlights$ = new Subject<AcNotification>();
  private network?: INetwork;
  @ViewChild('polylineEditor') polylineEditor: PolylinesEditorComponent;
  @ViewChild('networkLayer') networkLayer: AcLayerComponent;
  @ViewChild('highlightLayer') highlightLayer: AcLayerComponent;
  @ViewChild('linksLayer') linksLayer: AcLayerComponent;
  @ViewChild('markersLayer') markerLayer: AcLayerComponent;
  @ViewChild('pointShapeMenu') pointMenu: ShapeMenuComponent;

  @Input() mouseEvents: MouseEvents;

  private markers$ = new Subject<AcNotification>();
  pointContextItems = ['Adjust position...', 'Mark as Semaphore', 'Mark as Center', 'Mark as Regular'];
  shapeType = EditPoint;

  constructor(private cesiumService: CesiumService,
              private polylineService: PolylinesEditorService,
              private surveyStore: SurveyStoreService,
              private loaderService: LoaderService,
              private settingsService: ProjectSettingsService,
              private dialog: MatDialog,
              private keyboardService: KeyboardService) {
  }

  ngOnInit(): void {
    this.surveyStore.surveyAction$.subscribe((action) => {
      if (action.type === SurveyActionType.DELETE_POLYGON) {
        const survey = action.payload;
        survey.getBuildings()?.forEach(building => {
          this.deleteLink(building.uuid);
        });
      }
    });
    this.surveyStore.buildingAction$.subscribe((action) => {
      if (action.type === BuildingActionType.UPDATE_NETWORK_LINK) {
        const building = action.payload;
        if (building.linkPositions) {
          this.drawLink(building);
        } else {
          this.deleteLink(building.uuid);
        }
      }
    });
    this.settingsService.settingsUpdate$.subscribe(async () => {
      if (this.network == null) {
        return;
      }
      this.loaderService.show();
      await this.showStaticNetwork(this.network);
      await this.linkBuildings();
      this.loaderService.hide();
    });

    this.keyboardSubscription = this.keyboardService.keydown.subscribe(e => {
      this.keyDownEvent(e);
    });
  }

  ngOnDestroy(): void {
    this.polylines$.forEach(poly => poly.dispose());
    this.polylineSubscriptions.forEach(sub => sub.unsubscribe());
    this.mouseSubscriptions.forEach(sub => sub.unsubscribe());
    this.keyboardSubscription?.unsubscribe();
  }

  keyDownEvent(event: KeyboardEvent): void {
    if (event.keyCode === KeyCodes.CONTROL) {
      this.cesiumService.getCanvas().style.cursor = 'default';
    } else if (event.keyCode === KeyCodes.ESCAPE && this.isDrawing) {
      const poly = last(this.polylines$);
      if (poly && poly.getEditValue().editMode === EditModes.CREATE && poly.getCurrentPoints().length >= 1) {
        // workaround for finishing segment without adding a point

        // first add a temporary point
        let points = poly.getCurrentPoints();
        let lastPoint = points[points.length - 1];
        const newPos = Cesium.Cartesian3.add(lastPoint.getPosition(), new Cesium.Cartesian3(10, 10, 1), new Cesium.Cartesian3());
        // adds point and finish drawing
        this.addPoints([{position: newPos}], true);

        // then remove the last added point
        points = poly.getCurrentPoints();
        lastPoint = points[points.length - 1];
        this.polylineEditor.handleEditUpdates({
          editAction: EditActions.REMOVE_POINT,
          editMode: EditModes.CREATE_OR_EDIT,
          updatedPoint: lastPoint,
          id: lastPoint.getEditedEntityId()
        });
        if (points.length - 1 === 1) {
          poly.dispose();
          this.saveNetwork();
        }
      }
    }
  }

  startDrawing(): void {
    this.isDrawing = true;
    this.networkLayer.removeAll();
    this.markerLayer.removeAll();
    this.linksLayer.removeAll();
    this.network?.segments?.forEach((seg) => {
      const cartArr = Util.lngLatArrayToCartesian(seg);
      this.createNewSegment(cartArr);
    });
    this.network?.node_props?.forEach((props) => {
      const seg = this.polylines$[props.segment_index];
      const point = seg?.getCurrentPoints()[props.waypoint_index];
      if (point) {
        point.flightAltitude = props.flight_altitude;
        this.markPoint(point, NodeType[props.marker_type?.toUpperCase()]);
      }
    });
    this.setState(DrawingState.CREATE_SEGMENT);
    this.subscribeMouseEvents([NetworkMouseEvents.DRAW_EVENTS, NetworkMouseEvents.EDIT_EVENTS]);
    this.updateEditablePointLabels();
  }

  stopDrawing(): void {
    this.isDrawing = false;
    this.polylines$.forEach(segment => segment.dispose());
    this.polylines$ = [];
    this.unsubscribeMouseEvents();
    this.showStaticNetwork(this.network);
  }

  async linkBuildings(): Promise<LineSegment[]> {
    // remove previous links
    this.surveyStore.getLinkedBuildings().forEach((building) => {
      this.surveyStore.updateBuildingLink(building.surveyId, building.uuid, null, null);
    });

    const lineSegments = this.getNetworkLineSegments();
    const lockedBuildingPoints = this.surveyStore.getLockedBuildingPoints()
      .map(building => turf.point([building.center.lon, building.center.lat], {
        buildingId: building.uuid,
        surveyId: building.surveyId,
        flightAltitude: building.flightAltitude
      }));
    const getLinkedSegment = (buildingId: string): LineSegment => {
      return lineSegments.find(segment => segment.links.has(buildingId));
    };

    // create new links for buildings in each segment
    lineSegments.forEach(ls => {
      const searchWithIn = turf.buffer(ls.lineString, this.settingsService.settings.max_connector_distance / 1000);
      const nearbyBuildingPoints = turf.pointsWithinPolygon(turf.featureCollection(lockedBuildingPoints), searchWithIn);
      nearbyBuildingPoints.features.forEach(point => {
        const pointBuildingId = point.properties.buildingId;
        const pointCoord = point.geometry.coordinates;
        const nearestPoint = turf.nearestPointOnLine(ls.lineString, point);
        const nearestCoord = nearestPoint.geometry.coordinates;
        const cartA = Cesium.Cartesian3.fromDegrees(pointCoord[0], pointCoord[1]);
        const cartB = Cesium.Cartesian3.fromDegrees(nearestCoord[0], nearestCoord[1]);
        const previousLinkedSegment = getLinkedSegment(pointBuildingId);
        if (previousLinkedSegment) {
          const previousEndPoints: Cartesian3[] = previousLinkedSegment.links.get(pointBuildingId).linkPositions;
          const prevDistance = Cesium.Cartesian3.distance(previousEndPoints[0], previousEndPoints[1]);
          const newDistance = Cesium.Cartesian3.distance(cartA, cartB);
          if (newDistance <= prevDistance) {
            previousLinkedSegment.links.delete(pointBuildingId);
            ls.links.set(pointBuildingId, {
              buildingId: pointBuildingId,
              surveyId: point.properties.surveyId,
              linkPositions: [cartA, cartB]
            });
          }
        } else {
          ls.links.set(pointBuildingId, {
            buildingId: pointBuildingId,
            surveyId: point.properties.surveyId,
            linkPositions: [cartA, cartB]
          });
        }
      });
    });

    // get all link positions
    const cartographicArray = [];
    lineSegments.forEach(ls => {
      const lsPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(ls.positions);
      cartographicArray.push(...lsPositions);
      ls.links.forEach(link => {
        const linkPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(link.linkPositions);
        cartographicArray.push(...linkPositions);
      });
    });

    // let worker1: Worker;
    // if (typeof Worker !== 'undefined') {
    //   // Create a new
    //   worker1 = new Worker('../../../app.worker', {type: 'module'});
    //   worker1.postMessage(cartographicArray);
    // } else {
    //   // Web Workers are not supported in this environment.
    //   // You should add a fallback so that your program still executes correctly.
    // }
    // const updatedPositions: Cartographic[] = await new Promise(resolve => worker1.onmessage = ({data}) => {
    //   console.log(`page got message: ${data}`);
    //   resolve(data);
    // });

    // query heights
    const updatedPositions = await Cesium.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, cartographicArray);
    lineSegments.forEach(ls => {
      const lsCartographic = updatedPositions.splice(0, 2);
      ls.positions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(lsCartographic);
      ls.links.forEach(link => {
        // update link positions and altitude
        const cartographic = updatedPositions.splice(0, 2);
        const startToEnd = new Cesium.EllipsoidGeodesic(lsCartographic[0], lsCartographic[1]);
        const startToLink = new Cesium.EllipsoidGeodesic(lsCartographic[0], cartographic[1]);
        const fraction = startToLink.surfaceDistance / startToEnd.surfaceDistance;
        const startAlt = ls.flightAlts[0];
        const endAlt = ls.flightAlts[1];

        if (this.settingsService.settings.show_flight_altitude) {
          const startGrdElv = lsCartographic[0].height;
          const endGrdElv = lsCartographic[1].height;
          cartographic[1].height = startGrdElv + (endGrdElv - startGrdElv) * fraction;
        }
        link.flightAltitude = startAlt + (endAlt - startAlt) * fraction;
        link.linkPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(cartographic);
        this.surveyStore.updateBuildingLink(link.surveyId, link.buildingId, link.linkPositions, link.flightAltitude);
      });
    });
    return lineSegments;
  }

  async parseFlightNetwork(projectId: number, projectName: string): Promise<GcsNetwork> {
    // refresh links
    const lineSegments = await this.linkBuildings();
    const defaultFlightAlt = this.settingsService.settings.flight_altitude_m;

    const linkedBuildings = {};
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    this.surveyStore.getLinkedBuildings().forEach(building => linkedBuildings[building.uuid] = building);

    lineSegments.forEach(ls => {
      let segmentNodes: NetworkNode[] = [];
      const startLocation = Util.cartesian3ToLocation(ls.positions[0]);
      const endLocation = Util.cartesian3ToLocation(ls.positions[1]);
      // NOTE: may be get start node from previous segment?
      let startNode: NetworkNode = findNodeWithLatLng(nodes, startLocation.lon, startLocation.lat);
      let endNode: NetworkNode = findNodeWithLatLng(nodes, endLocation.lon, endLocation.lat);

      if (startNode == null) {
        const id = this.surveyStore.getNodeCount();
        const props = findNodeProps(this.network.node_props, ls.polyIndex, ls.pointIndex);
        const altitude = props?.flight_altitude || defaultFlightAlt;
        const type = props?.marker_type || NodeType.WAYPOINT;
        startNode = createNetworkNode(id, 'WP ' + id, type, startLocation, altitude);
      }

      if (endNode == null) {
        const id = this.surveyStore.getNodeCount();
        const props = findNodeProps(this.network.node_props, ls.polyIndex, ls.pointIndex + 1);
        const altitude = props?.flight_altitude || defaultFlightAlt;
        const type = props?.marker_type || NodeType.WAYPOINT;
        endNode = createNetworkNode(id, 'WP ' + id, type, endLocation, altitude);
      }

      if (startNode.id !== endNode.id) {
        ls.links.forEach((link) => {
          const building = linkedBuildings[link.buildingId];
          const address = building.address || '';
          const flightAltitude = building.flightAltitude || defaultFlightAlt;
          const buildingNode = createNetworkNode(building.gcsId, address, NodeType.DELIVERY, building.center, flightAltitude);
          nodes.push(buildingNode);

          if (building.linkPositions && building.linkPositions.length > 1) {
            const locationOnNetwork = building.linkPositions[1];
            const location = Util.cartesian3ToLocation(locationOnNetwork);
            let waypointNode: NetworkNode = findNodeWithLatLng(nodes, location.lon, location.lat);
            if (waypointNode == null) {
              const id = this.surveyStore.getNodeCount();
              const alt = building.flightAltitude || defaultFlightAlt;
              waypointNode = createNetworkNode(id, 'WP ' + id, NodeType.WAYPOINT, location, alt);
              segmentNodes.push(waypointNode);
            }
            edges.push(createNetworkEdge(this.surveyStore.getNodeCount(), waypointNode.id, buildingNode.id));
          }
        });

        // create edges between all the points in line segments
        segmentNodes.unshift(startNode);
        segmentNodes.push(endNode);
        segmentNodes = sortSegmentNodes(segmentNodes);
        for (let i = 0; i <= segmentNodes.length - 2; i++) {
          edges.push(createNetworkEdge(this.surveyStore.getNodeCount(), segmentNodes[i].id, segmentNodes[i + 1].id));
        }

        nodes.push(...segmentNodes);
      }
    });

    // update ground elevation for each node and download json
    const cartographicArray = nodes.map(node => Cesium.Cartographic.fromDegrees(Number(node.longitude_deg), Number(node.latitude_deg)));
    const updatePositions = await Cesium.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, cartographicArray);
    nodes.forEach((node, index) => {
      node.ground_elevation_m = updatePositions[index].height;
    });

    return {
      id: projectId,
      name: projectName,
      safe_up_land_timeout_sec: '30',
      nodes,
      edges
    };
  }

  addHighlights(nodes?: NetworkNode[], edges?: NetworkNode[][]): void {
    const settings = this.settingsService.settings;
    this.removeHighlights();
    // highlight nodes
    if (nodes?.length > 0) {
      nodes.forEach(node => {
        const nodeId = node.id.toString();
        const nodeType = node.node_type;
        const elevation = this.settingsService.settings.show_flight_altitude ? node.flight_altitude_m : 0;
        if (nodeType !== NodeType.DELIVERY.toLowerCase()) {
          const position = this.Cesium.Cartesian3.fromDegrees(parseFloat(node.longitude_deg), parseFloat(node.latitude_deg), elevation);
          const notification: AcNotification = {
            id: nodeId,
            actionType: ActionType.ADD_UPDATE,
            entity: {
              position,
              pixelSize: nodeType === NodeType.SEMAPHORE || nodeType === NodeType.CENTER ? 30 : 20,
              id: nodeId,
              color: Cesium.Color.fromAlpha(Cesium.Color.RED, 0.5),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }
          };
          this.highlights$.next(notification);
          this.highlightNotifications.push(notification);
        }
      });
    }

    // highlight edges
    if (edges?.length > 0) {
      edges.forEach((edge) => {
        const edgeId = edge[0].id + '' + edge[1].id;
        const posA = this.Cesium.Cartesian3.fromDegrees(
          parseFloat(edge[0].longitude_deg),
          parseFloat(edge[0].latitude_deg),
          edge[0].ground_elevation_m + edge[0].flight_altitude_m
        );
        const posB = this.Cesium.Cartesian3.fromDegrees(
          parseFloat(edge[1].longitude_deg),
          parseFloat(edge[1].latitude_deg),
          edge[1].ground_elevation_m + edge[1].flight_altitude_m
        );
        const notification: AcNotification = {
          id: edgeId,
          actionType: ActionType.ADD_UPDATE,
          entity: {
            id: edgeId,
            color: Cesium.Color.fromAlpha(Cesium.Color.RED, 0.5),
            clampToGround: !settings.show_flight_altitude,
            positions: [posA, posB]
          }
        };
        this.highlights$.next(notification);
        this.highlightNotifications.push(notification);
      });
    }
  }

  removeHighlights(): void {
    this.highlightNotifications.forEach(notification => {
      notification.actionType = ActionType.DELETE;
      this.highlights$.next(notification);
    });
    this.highlightNotifications = [];
  }

  import(network: INetwork): Promise<void> {
    if (!network) {
      return;
    }
    this.network = network;
    return this.showStaticNetwork(network);
  }

  private async showStaticNetwork(network: INetwork): Promise<void> {
    if (network == null) {
      return;
    }

    // reset layers
    this.networkLayer.removeAll();
    this.highlightLayer.removeAll();
    this.markerLayer.removeAll();

    let segments: Cartographic[][];
    const settings = this.settingsService.settings;

    // query heights if flight visualization is on otherwise
    if (settings.show_flight_altitude) {
      // convert all positions to cartographic and add in 1 array to query heights
      let positions: Cartographic[] = [];
      network.segments?.forEach((seg) => {
        const cartographicArray = Util.lngLatArrayToCartographicArray(seg);
        positions.push(...cartographicArray);
      });
      // query heights
      positions = await Cesium.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, positions);
      // divide positions in segments again
      segments = network.segments?.map(seg => positions.splice(0, seg.length));
    } else {
      // convert each segment to cartographic
      segments = network.segments?.map(seg => Util.lngLatArrayToCartographicArray(seg));
    }

    // loop through each segment to add markers and draw static polylines
    segments.forEach((segment, segmentIndex) => {
      const cartesianArray: Cartesian3[] = segment.map((point, pointIndex) => {
        const props = findNodeProps(network.node_props, segmentIndex, pointIndex);
        // elevate position if flight visualization is on
        if (settings.show_flight_altitude) {
          const alt = props?.flight_altitude || settings.flight_altitude_m || 0;
          point.height = point.height + alt;
        }
        const cartesian = Cesium.Cartographic.toCartesian(point);
        // add marker
        this.addMarker(uuidv4(), cartesian, NodeType[props?.marker_type?.toUpperCase()], !settings.show_flight_altitude);
        return cartesian;
      });

      // draw polyline
      this.networks$.next({
        id: uuidv4(),
        actionType: ActionType.ADD_UPDATE,
        entity: {
          id: uuidv4(),
          clampToGround: !settings.show_flight_altitude,
          positions: new Cesium.CallbackProperty(() => cartesianArray, false)
        }
      });
    });
  }

  private subscribeMouseEvents(events: NetworkMouseEvents[]): void {
    const mEvents = this.mouseEvents;
    if (events.includes(NetworkMouseEvents.DRAW_EVENTS)) {
      const ctrlClickSubscription = mEvents.leftCtrlClick.subscribe((event) => {
        if (this.isDrawing && event.entities?.length > 0 && event.entities[0] instanceof EditPoint) {
          const entity = event.entities[0];
          const manualPoint = {
            position: entity.getPosition(),
            hookPoint: entity
          };
          if (this.state === DrawingState.CREATE_SEGMENT) {
            this.manualPoints.push(manualPoint);
            this.createNewSegment();
            this.addPoints(this.manualPoints);
          } else if (event.entities[0].getEditedEntityId() !== last(this.polylines$).getEditValue().id) {
            this.manualPoints.push(manualPoint);
            this.addPoints(this.manualPoints, true);
          }
        }
      });

      const clickSubscription = mEvents.leftClick.subscribe((event) => {
        if (this.isDrawing && this.state === DrawingState.CREATE_SEGMENT) {
          if (event.entities?.length > 0 && event.entities[0] instanceof EditPoint) {
            return;
          }
          const cartesian = this.cesiumService.getViewer().camera.pickEllipsoid(event.movement.endPosition,
            this.cesiumService.getScene().globe.ellipsoid);
          this.createNewSegment();
          this.manualPoints.push({
            position: cartesian,
          });
          this.addPoints(this.manualPoints);
        }
      });

      // for changing mouse cursor
      const mouseMoveSubscription = this.cesiumService.getMap().getMapEventsManager().register({
        event: CesiumEvent.MOUSE_MOVE,
        priority: 100,
        pick: PickOptions.PICK_FIRST,
        modifier: CesiumEventModifier.CTRL
      }).subscribe((result) => {
        if (this.isDrawing && result.entities?.length > 0 && result.entities[0] instanceof EditPoint) {
          this.cesiumService.getCanvas().style.cursor = 'alias';
        }
      });

      this.mouseSubscriptions.push(clickSubscription, ctrlClickSubscription, mouseMoveSubscription);
    }

    if (events.includes(NetworkMouseEvents.EDIT_EVENTS)) {
      const rightCtrlClickSubscription = mEvents.rightCtrlClick.subscribe((event) => {
        if ((this.isDrawing || this.isEditing) && event.entities?.length > 0 && event.entities[0] instanceof EditPoint) {
          const editPoint = event.entities[0];
          // if polyline has <= 2 points than remove event won't work
          // so dispose the polyline altogether
          const polylineIndex = this.polylines$.findIndex(poly => editPoint.getEditedEntityId() === poly.getEditValue().id);
          const polyline = this.polylines$[polylineIndex];
          if (polyline && polyline.getCurrentPoints().length <= 2) {
            polyline.getCurrentPoints().forEach(point => {
              // if edit point had marker then remove it
              if (point.secondaryMarker != null) {
                this.markPoint(point, NodeType.WAYPOINT);
              }
            });
            polyline.dispose();
            this.polylines$.splice(polylineIndex, 1);
            this.saveNetwork();
          }
        }
      });
      const rightClickSubscription = mEvents.rightClick.subscribe((event) => {
        if ((this.isDrawing || this.isEditing) && event.entities?.length > 0 && event.entities[0] instanceof EditPoint) {
          this.pointMenu.open(event.movement, event.entities[0]);
        }
      });
      this.mouseSubscriptions.push(rightClickSubscription, rightCtrlClickSubscription);
    }
  }

  private unsubscribeMouseEvents(): void {
    this.mouseSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.mouseSubscriptions = [];
  }

  private setState(state: DrawingState): void {
    this.state = state;
  }

  private createNewSegment(cartArray?: Cartesian3[]): void {
    // create from cartesian array
    let polyline$;
    if (cartArray) {
      polyline$ = this.polylineService.edit(cartArray, this.DEFAULT_POLYLINE_PROPS);
      // connect points with same locations as the points of current polyline
      const points = polyline$.getCurrentPoints();
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      this.polylines$.forEach(poly => {
        poly.getCurrentPoints().forEach(point => {
          if (isCloseTo(firstPoint.getPosition(), point.getPosition())) {
            this.connectPoints(firstPoint, point);
          }
          if (isCloseTo(lastPoint.getPosition(), point.getPosition())) {
            this.connectPoints(lastPoint, point);
          }
        });
      });
    } else {
      polyline$ = this.polylineService.create(this.DEFAULT_POLYLINE_PROPS);
      this.setState(DrawingState.ADD_FIRST_POINT);
    }
    this.polylines$.push(polyline$);

    // subscribe for edit updates
    const polylineSubscription = polyline$.subscribe((editUpdate: PolylineEditUpdate) => {
      if (editUpdate.editAction === EditActions.ADD_POINT || editUpdate.editAction === EditActions.ADD_LAST_POINT) {
        const manualPoint = this.manualPoints.pop();
        if (polyline$.getCurrentPoints().length > 0 && manualPoint && manualPoint.hookPoint) {
          const hook = manualPoint.hookPoint;
          // adjust the point according to hook point
          const newPoint = last(polyline$.getCurrentPoints());
          newPoint.setPosition(hook.getPosition());
          // work around for reflecting above position change
          const movement = Util.cartesianToMovement(this.cesiumService.getScene(), hook.getPosition());
          const moveAction = this.cesiumService.getViewer().screenSpaceEventHandler.getInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          moveAction(movement);
          // hook points to each other
          this.connectPoints(newPoint, hook);
        }
        if (editUpdate.editAction === EditActions.ADD_LAST_POINT) {
          // the polyline should have minimum 2 points
          if (polyline$.getCurrentPoints().length < 2) {
            polyline$.dispose();
            this.polylines$.pop();
          }
          // starts a new segment automatically on next click
          this.setState(DrawingState.CREATE_SEGMENT);
        } else {
          this.setState(DrawingState.ADD_NEW_POINT);
        }
      } else if (editUpdate.editAction === EditActions.DRAG_POINT) {
        this.updateBoundPoints(editUpdate);
      } else if (editUpdate.editAction === EditActions.REMOVE_POINT) {
        const boundPoints = editUpdate.updatedPoint.boundTo;
        boundPoints?.forEach(point => {
          const index = point.boundTo?.findIndex(bounded => editUpdate.updatedPoint.getId() === bounded.getId());
          point.boundTo?.splice(index, 1);
        });
        this.markPoint(editUpdate.updatedPoint, NodeType.WAYPOINT);
      }
      const editAction = editUpdate.editAction;
      if (editAction === EditActions.ADD_POINT
        || editAction === EditActions.ADD_LAST_POINT
        || editAction === EditActions.REMOVE_POINT
        || editAction === EditActions.DRAG_POINT_FINISH) {
        this.saveNetwork();
      }
      this.updateEditablePointLabels();
    });
    this.polylineSubscriptions.push(polylineSubscription);
  }

  private addPoints(points: ManualPoint[], finishDrawing: boolean = false): void {
    if (points.length <= 0) {
      return;
    }
    const lastPoint = points[points.length - 1];

    // simulate click for each position
    points?.forEach(point => {
      const movement = Util.cartesianToMovement(this.cesiumService.getScene(), point.position);
      const leftClickAction = this.cesiumService.getViewer().screenSpaceEventHandler.getInputAction(CesiumEvent.LEFT_CLICK);
      if (movement != null) {
        leftClickAction(movement);
      }
    });

    if (finishDrawing) {
      const movement = Util.cartesianToMovement(this.cesiumService.getScene(), lastPoint.position);
      const doubleClickAction = this.cesiumService.getViewer().screenSpaceEventHandler.getInputAction(CesiumEvent.LEFT_DOUBLE_CLICK);
      if (movement != null) {
        doubleClickAction(movement);
      }
    }
  }

  private connectPoints(newPoint: EditPoint, hookPoint: EditPoint): void {
    // add points to bound array
    if (newPoint.boundTo == null) {
      newPoint.boundTo = [];
    }
    if (hookPoint.boundTo == null) {
      hookPoint.boundTo = [];
    }
    newPoint.boundTo.push(hookPoint);
    hookPoint.boundTo.push(newPoint);
    newPoint.flightAltitude = hookPoint.flightAltitude;
  }

  private updateEditablePointLabels(recalculate: boolean = true): void {
    if (this.polylines$ == null || this.polylines$.length === 0) {
      return;
    }
    if (recalculate) {
      const pathFinder = new PathFinder(this.polylines$);
      this.polylines$.forEach(p => {
        const newLabels: LabelProps[] = [];
        p.getCurrentPoints().forEach(point => {
          const distance = pathFinder.getDistanceFromNearestSemaphore(point);
          newLabels.push({
            text: distance,
            scale: 0.6,
            showBackground: true,
            backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.7),
            fillColor: Cesium.Color.WHITE,
            backgroundPadding: new Cesium.Cartesian2(7, 6),
            disableDepthTestDistance: 0,
            pixelOffset: new Cesium.Cartesian2(11, 0),
          });
        });
        p.updateLabels(newLabels);
      });
    } else {
      this.polylines$.forEach(p => {
        p.updateLabels(p.getLabels().map((label, i) => {
          label.position = p.getCurrentPoints()[i].getPosition();
          return label;
        }));
      });
    }
  }

  private drawLink(building: OSMBuilding): void {
    let positions = building.linkPositions;
    if (this.settingsService.settings.show_flight_altitude) {
      const cartos = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
      const buildingAlt = building.flightAltitude || this.settingsService.settings.flight_altitude_m;
      cartos[0].height = cartos[0].height + buildingAlt;
      cartos[1].height = cartos[1].height + building.linkAltitude;
      positions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(cartos);
    }

    const notification: AcNotification = {
      id: building.uuid,
      actionType: ActionType.ADD_UPDATE,
      entity: {
        id: building.uuid,
        color: Cesium.Color.YELLOW,
        clampToGround: !this.settingsService.settings.show_flight_altitude,
        positions: new Cesium.CallbackProperty(() => positions, false)
      }
    };
    this.links$.next(notification);
  }

  private deleteLink(buildingId?: string): void {
    const notification: AcNotification = {
      id: buildingId,
      actionType: ActionType.DELETE,
    };
    this.links$.next(notification);
  }

  // prepare segments
  private getNetworkLineSegments(): LineSegment[] {
    const lineSegments: LineSegment[] = [];
    const defaultAlt = this.settingsService.settings.flight_altitude_m;
    this.network?.segments?.forEach((segment, segmentIndex) => {
      const segmentPositions = Util.lngLatArrayToCartesian(segment);
      segmentPositions.forEach((position, pointIndex) => {
        if (pointIndex + 1 < segmentPositions.length) {
          const locationA = Util.cartesian3ToLocation(position);
          const locationB = Util.cartesian3ToLocation(segmentPositions[pointIndex + 1]);
          const lineString = turf.lineString([[locationA.lon, locationA.lat], [locationB.lon, locationB.lat]]);
          const flightAltA = findNodeProps(this.network.node_props, segmentIndex, pointIndex)?.flight_altitude || defaultAlt;
          const flightAltB = findNodeProps(this.network.node_props, segmentIndex, pointIndex + 1)?.flight_altitude || defaultAlt;
          lineSegments.push({
            polyIndex: segmentIndex,
            pointIndex,
            lineString,
            positions: [position, segmentPositions[pointIndex + 1]],
            flightAlts: [flightAltA, flightAltB],
            links: new Map<string, BuildingLink>()
          });
        }
      });
    });
    return lineSegments;
  }

  private saveNetwork(): void {
    const segments = [];
    const props: INodeProps[] = [];
    this.polylines$.forEach((poly, index) => {
      const points = poly.getCurrentPoints();
      if (points.length >= 2) {
        const nodes = points.map((p, i) => {
          if (p.flightAltitude != null || p.secondaryMarker) {
            props.push({
              segment_index: index,
              waypoint_index: i,
              flight_altitude: p.flightAltitude,
              // @ts-ignore
              marker_type: p.secondaryMarker?.nodeType
            });
          }
          const location = Util.cartesian3ToLocation(p.getPosition());
          return [location.lon, location.lat];
        });
        segments.push(nodes);
      }
    });
    this.network = {
      id: uuidv4(),
      node_props: props,
      segments
    };
    this.surveyStore.saveNetwork(this.network);
  }

  private markPoint(point: EditPoint, nodeType: NodeType): void {
    point.secondaryMarker = this.addMarker(point.getId(), point.getPosition(), nodeType);
  }

  private addMarker(id: string, position: Cartesian3, nodeType: NodeType, clampToGround: boolean = true): AcEntity {
    if (position == null || nodeType == null) {
      return;
    }

    const heightReference = clampToGround ? Cesium.HeightReference.RELATIVE_TO_GROUND : Cesium.HeightReference.NONE;
    const markerPos = Cesium.Cartographic.fromCartesian(position);
    const startHeight = clampToGround ? 0 : markerPos.height;
    markerPos.height = startHeight + 0.05;
    const pointPos = Cesium.Cartographic.toCartesian(markerPos);
    markerPos.height = startHeight + 0.07;
    const textPos = Cesium.Cartographic.toCartesian(markerPos);
    let secondaryMarker;
    if (nodeType === NodeType.SEMAPHORE) {
      secondaryMarker = {
        id,
        position: pointPos,
        labelPos: textPos,
        color: Cesium.Color.RED,
        text: 'S',
        disableDepthTestDistance: clampToGround ? undefined : Number.POSITIVE_INFINITY,
        heightReference,
        nodeType
      };
    } else if (nodeType === NodeType.CENTER) {
      secondaryMarker = {
        id,
        position: pointPos,
        labelPos: textPos,
        color: Cesium.Color.BLUE,
        disableDepthTestDistance: clampToGround ? undefined : Number.POSITIVE_INFINITY,
        text: '⦿',
        heightReference,
        nodeType
      };
    } else {
      secondaryMarker = null;
      const removeNotification: AcNotification = {
        id,
        actionType: ActionType.DELETE
      };
      this.markers$.next(removeNotification);
    }

    if (secondaryMarker) {
      const addNotification: AcNotification = {
        id,
        actionType: ActionType.ADD_UPDATE,
        entity: secondaryMarker
      };
      this.markers$.next(addNotification);
      return secondaryMarker;
    }
  }

  private updateBoundPoints(editUpdate: PolylineEditUpdate): void {
    let markerUpdated = false;
    const editPoint = editUpdate.updatedPoint;
    // if the points has marker than update it's position
    if (editPoint.secondaryMarker != null) {
      // @ts-ignore
      this.markPoint(editPoint, editPoint.secondaryMarker.nodeType);
      markerUpdated = true;
    }

    if (editPoint.boundTo != null) {
      // update bound points as well
      editPoint.boundTo.forEach((point) => {
        point.props.disableDepthTestDistance = undefined;
        point.flightAltitude = editPoint.flightAltitude;
        editUpdate.updatedPoint = point;
        editUpdate.id = point.getEditedEntityId();
        this.polylineEditor.handleEditUpdates(editUpdate);
        point.props.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        // if point moved does not have marker but one of it's bound points has,
        // then it's marker needs to updated after position change
        if (!markerUpdated && point.secondaryMarker) {
          // @ts-ignore
          this.markPoint(point, point.secondaryMarker.nodeType);
          markerUpdated = true;
        }
      });
    }
  }

  onPointMenuItemClick(event: ShapeMenuEvent): void {
    const shape = event.editableShape;
    if (shape instanceof EditPoint) {
      if (event.itemIndex === 0) {
        const location = Util.cartesian3ToLocation(shape.getPosition());
        AdjustmentDialogComponent.show(this.dialog, this.cesiumService, {
          location,
          altitude: shape.flightAltitude,
          globalAltitude: this.settingsService.settings.flight_altitude_m
        }).subscribe((result: PointOffset) => {
          if (result == null) {
            return;
          }
          shape.flightAltitude = result.altitude;
          shape.props.disableDepthTestDistance = undefined; // workaround for manual updates
          const cartesian = Util.locationToCartesian3(result.location);
          const update = {
            id: shape.getEditedEntityId(),
            editMode: EditModes.EDIT,
            updatedPosition: cartesian,
            updatedPoint: shape,
            editAction: EditActions.DRAG_POINT,
          };
          this.polylineEditor.handleEditUpdates(update);
          this.updateBoundPoints(update);
          this.saveNetwork();
          shape.props.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        });
      } else if (event.itemIndex === 1) {
        this.markPoint(event.editableShape, NodeType.SEMAPHORE);
        this.updateEditablePointLabels();
        this.saveNetwork();
      } else if (event.itemIndex === 2) {
        this.markPoint(event.editableShape, NodeType.CENTER);
        this.saveNetwork();
      } else {
        this.markPoint(event.editableShape, NodeType.WAYPOINT);
        this.saveNetwork();
      }
    }
  }
}
