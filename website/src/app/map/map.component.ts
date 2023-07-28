import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {
  CesiumEvent,
  CesiumEventModifier,
  MapsManagerService,
  MapTerrainProviderOptions,
  PickOptions,
  ViewerConfiguration
} from 'angular-cesium';
import {ReadMode} from 'ngx-file-helpers';
import {EventResult} from 'angular-cesium/lib/angular-cesium/services/map-events-mananger/map-events-manager';
import {SurveyStoreService} from './services/survey-store.service';
import {LoaderService} from '../loader.service';
import {SurveyArea} from './models/survey-area';
import {AuthService} from '../auth/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {NetworkLayerComponent} from './components/network-layer/network-layer.component';
import {Util} from './util';
import {CloudSyncComponent} from './components/cloud-sync/cloud-sync.component';
import {ComponentCanDeactivate} from '../common/util/pending-changes.guard';
import {EMPTY, from, Observable, of, Subject, Subscription} from 'rxjs';
import {ProjectService} from '../project/project.service';
import {MatDialog} from '@angular/material/dialog';
import {HelpDialogComponent} from './components/help-dialog/help-dialog.component';
import {GcsService} from '../common/services/gcs.service';
import {SurveyLayerComponent} from './components/survey-layer/survey-layer.component';
import {NetworkErrorViewerComponent} from './components/network-error-viewer/network-error-viewer.component';
import * as turf from '@turf/turf';
import {ValidationError} from '../common/models/validation-error';
import {map, switchMap} from 'rxjs/operators';
import {PolygonLayerComponent} from './components/polygon-layer/polygon-layer.component';
import {ExportError} from '../common/models/export-error';
import {MeasureType} from './components/measure-tool/measure-tool.component';
import {SettingsDialogComponent} from './components/settings-dialog/settings-dialog.component';
import {Project} from '../project/models/project';
import {BuildingsService} from './services/buildings.service';
import {SyncService} from './services/sync.service';
import {MouseEvents} from './models/mouse-events';
import {ProjectSettingsService} from './services/project-settings.service';
import {NetworkEdge} from './components/network-layer/models/gcs-network';
import {doOnSubscribe} from '../common/util/util';
import {CesiumAssetsDialogComponent} from './components/cesium-assets-dialog/cesium-assets-dialog.component';
import {CesiumAsset, LayerType} from '../common/models/cesium-asset';

enum DrawingType {
  POLYGON,
  NETWORK,
  POINTS
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  providers: [MapsManagerService, ViewerConfiguration, SurveyStoreService, BuildingsService, SyncService, ProjectSettingsService]
})
export class MapComponent implements AfterViewInit, OnInit, OnDestroy, ComponentCanDeactivate {
  private subscriptions: Subscription = new Subscription();
  eLayerType = LayerType;
  eDrawingType = DrawingType;
  eMeasureType = MeasureType;
  eReadMode = ReadMode;

  Cesium = Cesium;
  viewer: any;
  MapTerrainProviderOptions = MapTerrainProviderOptions;

  projectData: Project;
  showProgress = false;
  mapProps = {
    drawingType: null,
    measureType: null,
    showSurveys: false,
    globalImageryAssetId: null
  };
  dataSourcesMap = {};

  validationErrors = new Subject<ValidationError[]>();
  exportErrorSubject = new Subject<ExportError>();
  errorMsgSubject = new Subject<string>();
  successMsgSubject = new Subject<string>();
  mouseEvents: MouseEvents = {
    leftUp: new EventEmitter<EventResult>(),
    leftDown: new EventEmitter<EventResult>(),
    leftClick: new EventEmitter<EventResult>(),
    leftCtrlClick: new EventEmitter<EventResult>(),
    rightClick: new EventEmitter<EventResult>(),
    rightCtrlClick: new EventEmitter<EventResult>(),
    mouseMove: new EventEmitter<EventResult>(),
    doubleClick: new EventEmitter<EventResult>()
  };
  @ViewChild('polygonLayer') polygonLayer: PolygonLayerComponent;
  @ViewChild('networkLayer') networkLayer: NetworkLayerComponent;
  @ViewChild('cloudSync') syncComponent: CloudSyncComponent;
  @ViewChild('networkErrorViewer') errorViewer: NetworkErrorViewerComponent;
  @ViewChildren('surveyLayers') surveyComponents: QueryList<SurveyLayerComponent>;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private projectService: ProjectService,
              private authService: AuthService,
              public cesiumService: MapsManagerService,
              private viewerConf: ViewerConfiguration,
              private loaderService: LoaderService,
              public surveyStore: SurveyStoreService,
              private gcsService: GcsService,
              private settingsService: ProjectSettingsService,
              private dialog: MatDialog,
              private cdRef: ChangeDetectorRef) {
    viewerConf.viewerOptions = {
      selectionIndicator: true,
      timeline: false,
      infoBox: false,
      baseLayerPicker: false,
      animation: false,
      shouldAnimate: false,
      homeButton: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      targetFrameRate: 30
    };
  }

  ngOnInit(): void {
    this.loaderService.loaderState.subscribe((show) => {
      this.showProgress = show;
    });

    this.route.paramMap.subscribe((params) => {
      const projectId = params.get('id');
      const projectSubscription = this.loadProjectData(projectId).pipe(switchMap(() => {
        this.surveyStore.importSurveys(this.projectData.survey_areas);
        return of(this.polygonLayer.flyToPolygons());
      })).subscribe((success) => {
        if (success) {
          this.loaderService.show();
          this.cdRef.detectChanges();
          if (this.viewer.scene.globe.tilesLoaded) {
            this.tileProgressListener(0);
          } else {
            this.viewer.scene.globe.tileLoadProgressEvent.addEventListener(this.tileProgressListener);
          }
        }
      });
      this.subscriptions.add(projectSubscription);
    });
  }

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.syncComponent.isSyncing();
  }

  ngOnDestroy(): void {
    this.syncComponent.stopSync();
    this.subscriptions.unsubscribe();
    this.viewer.scene.globe.tileLoadProgressEvent.removeEventListener(this.tileProgressListener);
  }

  ngAfterViewInit(): void {
    this.viewer = this.cesiumService.getMap().getCesiumViewer();
    this.viewer.camera.frustum.near = 1.0;
    this.registerMouseEvents();
  }

  private loadProjectData(projectId: string): Observable<Project> {
    return new Observable(observer => {
      this.projectService.getProject(projectId).subscribe((response) => {
        if (response.success) {
          this.projectData = response.data;
          this.settingsService.settings = this.projectData.settings;
          observer.next(this.projectData);
          observer.complete();
        }
      });
    });
  }

  private registerMouseEvents(): void {
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.LEFT_CLICK, // event type enum. [required!]
      priority: 94,
      pick: PickOptions.PICK_FIRST // entity pick option, default PickOptions.NO_PICK. [optional]
    }).subscribe((result) => {
      this.mouseEvents.leftClick.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.LEFT_DOWN,
      priority: 94,
      pick: PickOptions.PICK_FIRST
    }).subscribe((result) => {
      this.mouseEvents.leftDown.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.LEFT_UP,
      priority: 100,
    }).subscribe((result) => {
      this.mouseEvents.leftUp.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.MOUSE_MOVE,
      priority: 94,
    }).subscribe((result) => {
      this.mouseEvents.mouseMove.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.LEFT_CLICK,
      priority: 94,
      modifier: CesiumEventModifier.CTRL,
      pick: PickOptions.PICK_FIRST
    }).subscribe((result) => {
      this.mouseEvents.leftCtrlClick.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.RIGHT_CLICK,
      priority: 100,
      pick: PickOptions.PICK_FIRST
    }).subscribe((result) => {
      this.mouseEvents.rightClick.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.RIGHT_CLICK,
      modifier: CesiumEventModifier.CTRL,
      priority: 100,
      pick: PickOptions.PICK_FIRST
    }).subscribe((result) => {
      this.mouseEvents.rightCtrlClick.emit(result);
    });
    this.cesiumService.getMap().getMapEventsManager().register({
      event: CesiumEvent.LEFT_DOUBLE_CLICK,
      priority: 100,
      pick: PickOptions.PICK_FIRST
    }).subscribe((result) => {
      this.mouseEvents.doubleClick.emit(result);
    });
  }

  private async onMapReady(): Promise<void> {
    this.viewer.scene.globe.tileLoadProgressEvent.removeEventListener(this.tileProgressListener);
    this.mapProps.showSurveys = true;
    await this.networkLayer.import(this.projectData.network);
    await this.networkLayer.linkBuildings();
    this.syncComponent.startSync(Number(this.projectData.id));
    this.loaderService.hide();
    this.cdRef.detectChanges();
    this.surveyStore.createPlaceholderSurvey();
    const enabledLayers = this.settingsService.layers.filter(layer => layer.enabled);
    enabledLayers.forEach(layer => this.toggleLayer(layer, true, false));
  }

  openProjectSettings(): void {
    SettingsDialogComponent.show(this.dialog, {...this.settingsService.settings}).pipe(switchMap(settings => {
      if (settings) {
        return this.projectService.updateSettings(this.projectData.id, settings)
          .pipe(map(response => ({response, settings})));
      } else {
        return EMPTY;
      }
    })).subscribe(({response, settings}) => {
      if (response.success) {
        this.settingsService.settings = settings;
        this.successMsgSubject.next('Settings updated successfully!');
      }
    });
  }

  showProjectLayers(): void {
    CesiumAssetsDialogComponent.show(this.dialog, {
      projectId: this.projectData.id,
      selectedAssets: this.settingsService.layers
    }).subscribe((assets) => {
      this.updateProjectLayers(assets);
    });
  }

  getLayersByType(type: LayerType): CesiumAsset[] {
    const layers = this.settingsService.layers.filter(layer => layer.type === type);
    return layers.sort((a, b) => {
      if (a.global) {
        return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
      } else {
        return (b.name < b.name) ? -1 : 1;
      }
    });
  }

  private updateProjectLayers(assets: CesiumAsset[]): void {
    if (assets) {
      this.settingsService.layers = assets;
      this.projectService.updateSettings(this.projectData.id, this.settingsService.settings)
        .subscribe((res) => {
          if (res.success) {
            this.successMsgSubject.next('Layers updated successfully!');
          } else {
            this.errorMsgSubject.next('Layers update failed!');
          }
        });
    }
  }

  startDrawing(type: DrawingType): void {
    if (type === DrawingType.POLYGON) {
      this.polygonLayer.startDrawing();
    } else if (type === DrawingType.NETWORK) {
      this.networkLayer.startDrawing();
    }
    this.mapProps.drawingType = type;
    this.cdRef.detectChanges();
  }

  stopDrawing(): void {
    if (this.mapProps.drawingType === DrawingType.POLYGON) {
      this.polygonLayer.stopDrawing();
    } else if (this.mapProps.drawingType === DrawingType.NETWORK) {
      this.networkLayer.stopDrawing();
    }
    this.mapProps.drawingType = null;
  }

  startMeasuring(type: MeasureType): void {
    this.mapProps.measureType = type;
  }

  stopMeasuring(): void {
    this.mapProps.measureType = null;
  }

  isInMeasureMode(): boolean {
    return this.mapProps.measureType != null;
  }

  isInDrawingMode(): boolean {
    return this.mapProps.drawingType != null;
  }

  toggleLayer(asset: CesiumAsset, checked: boolean, updateSettings: boolean = true): void {
    const imageryLayers = this.viewer.imageryLayers;
    switch (asset.type) {
      case LayerType.IMAGERY:
        if (asset.global) {
          if (checked) {
            if (this.mapProps.globalImageryAssetId) {
              const oldAsset = this.settingsService.layers.find(layer => layer.id === this.mapProps.globalImageryAssetId);
              if (oldAsset) {
                oldAsset.enabled = false;
              }
              this.mapProps.globalImageryAssetId = null;
            }
            imageryLayers.remove(imageryLayers.get(0), true);
            if (asset.id === 101) { // asset id for OSM hardcoded in DB model
              imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider(), 0);
            } else {
              imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({assetId: asset.id}), 0);
            }
            this.mapProps.globalImageryAssetId = asset.id;
            asset.enabled = checked;
          }
        } else {
          if (checked) {
            this.dataSourcesMap[asset.id] = imageryLayers.addImageryProvider(
              new Cesium.IonImageryProvider({assetId: asset.id})
            );
          } else if (this.dataSourcesMap[asset.id]) {
            imageryLayers.remove(this.dataSourcesMap[asset.id], true);
            this.dataSourcesMap[asset.id] = null;
          }
          asset.enabled = checked;
        }
        break;
      case LayerType.GEOJSON:
        if (checked) {
          Cesium.IonResource.fromAssetId(asset.id).then((resource) => {
            return Cesium.GeoJsonDataSource.load(resource, {
              clampToGround: true
            });
          }).then((dataSource) => {
            this.viewer.dataSources.add(dataSource);
            this.dataSourcesMap[asset.id] = dataSource;
          });
        } else if (this.dataSourcesMap[asset.id]) {
          this.viewer.dataSources.remove(this.dataSourcesMap[asset.id], true);
          this.dataSourcesMap[asset.id] = null;
        }
        asset.enabled = checked;
        break;
      case LayerType.TILES:
        if (checked) {
          this.dataSourcesMap[asset.id] = this.viewer.scene.primitives.add(
            new Cesium.Cesium3DTileset({
              url: Cesium.IonResource.fromAssetId(asset.id),
            })
          );
        } else if (this.dataSourcesMap[asset.id]) {
          this.viewer.scene.primitives.remove(this.dataSourcesMap[asset.id]);
          this.dataSourcesMap[asset.id] = null;
        }
        asset.enabled = checked;
        break;
    }
    if (updateSettings) {
      this.updateProjectLayers(this.settingsService.layers);
    }
  }

  highlightError(error: ValidationError): void {
    if (error == null) {
      return;
    }
    // save node positions for focus
    const focusTurfPoints = [];
    let maxHeight = 0;
    error.nodes?.forEach((node) => {
      focusTurfPoints.push(turf.point([parseFloat(node.longitude_deg), parseFloat(node.latitude_deg)]));
      let height;
      if (this.settingsService.settings.show_flight_altitude) {
        height = node.ground_elevation_m + node.flight_altitude_m;
      } else {
        height = node.ground_elevation_m;
      }
      if (height > maxHeight) {
        maxHeight = height;
      }
    });

    // highlight building nodes
    const components = this.surveyComponents.toArray();
    components.forEach(comp => comp.addHighlights(error.node_ids));
    // highlight network nodes and edges
    this.networkLayer.addHighlights(error.nodes, error.edges);

    // auto-focus camera on errors
    if (focusTurfPoints.length !== 0) {
      let focusPoints;
      const enclosingPolygon = turf.envelope(turf.featureCollection(focusTurfPoints));
      const nonPaddedPositions = Util.lngLatArrayToCartesian(enclosingPolygon.geometry?.coordinates[0]);
      const nonPaddedBounds = new Cesium.BoundingSphere.fromPoints(nonPaddedPositions);

      // increase radius by 15 percent
      const radius = nonPaddedBounds.radius * 0.15 < 80 ? 80 : nonPaddedBounds.radius * 0.15;
      const bufferedFocusPolygon = turf.buffer(enclosingPolygon, radius, {units: 'meters'});
      // get new bounding cartographic points
      if (bufferedFocusPolygon.geometry?.type.toLowerCase() === 'multipolygon') {
        const coordinatesArrays = [];
        bufferedFocusPolygon.geometry?.coordinates.forEach(coordArray => {
          coordinatesArrays.push(...coordArray[0]);
        });
        focusPoints = Util.lngLatArrayToCartographicArray(coordinatesArrays);
      } else {
        focusPoints = Util.lngLatArrayToCartographicArray(bufferedFocusPolygon.geometry?.coordinates[0]);
      }
      // offset height of cartographic points
      focusPoints = focusPoints.map(cartographic => {
        cartographic.height = maxHeight;
        return Cesium.Cartographic.toCartesian(cartographic);
      });
      // fly to bounding rectangle
      this.viewer.scene.camera.flyToBoundingSphere(new Cesium.BoundingSphere.fromPoints(focusPoints), {
        duration: 1,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90.0), 0)
      });
    }
  }

  removeErrorHighlights(): void {
    const components = this.surveyComponents.toArray();
    components.forEach(comp => comp.removeHighlights());
    this.networkLayer.removeHighlights();
  }

  getSurveys(): SurveyArea[] {
    return this.surveyStore.surveys;
  }

  trackSurveysBy(index: number, survey: SurveyArea): string {
    return survey.id;
  }

  linkBuildings(): void {
    from(this.networkLayer.linkBuildings()).pipe(
      doOnSubscribe(() => this.loaderService.show())
    ).subscribe(() => {
      this.loaderService.hide();
    });
  }

  exportSurveys(): void {
    from(this.networkLayer.linkBuildings()).pipe(
      doOnSubscribe(() => this.loaderService.show())
    ).subscribe(() => {
      this.surveyStore.exportSurveys();
      this.loaderService.hide();
    });
  }

  exportFlightNetwork(): void {
    from(this.networkLayer.parseFlightNetwork(this.projectData.id, this.projectData.name)).pipe(
      doOnSubscribe(() => this.loaderService.show())
    ).subscribe(network => {
      Util.downloadJSON(network, 'flight-network.json');
      this.loaderService.hide();
    });
  }

  exportFlightNetworkToGCS(): void {
    from(this.networkLayer.parseFlightNetwork(this.projectData.id, this.projectData.name)).pipe(
      doOnSubscribe(() => this.loaderService.show()),
      switchMap(network => {
        return this.gcsService.updateFlightNetwork(this.projectData.gcs_url, network);
      })
    ).subscribe(() => {
      this.exportErrorSubject.next(null);
    }, err => {
      if (err.status === 401) {
        window.open(this.projectData.gcs_login_url, '_blank');
      } else if (err.status === 409) {
        const exportError = err.error as ExportError;
        this.exportErrorSubject.next(exportError);
      }
    }, () => this.loaderService.hide());
  }

  validateFlightNetwork(): void {
    from(this.networkLayer.parseFlightNetwork(this.projectData.id, this.projectData.name)).pipe(
      doOnSubscribe(() => this.loaderService.show()),
      switchMap(network =>
        this.gcsService.validateFlightNetwork(this.projectData.gcs_url, JSON.stringify(network))
          .pipe(map(response => ({network, response})))
      )
    ).subscribe(({network, response}) => {
      const errors = response.validation_errors;
      errors.forEach(err => {
        err.nodes = [];
        err.edges = [];
        err.node_ids.forEach(id => {
          err.nodes.push(network.nodes.find(node => node.id === id));
        });
        err.edge_ids.forEach(id => {
          const networkEdge: NetworkEdge = network.edges.find(edge => edge.id === id);
          const fromNode = network.nodes.find(node => node.id === networkEdge.from_vertex_id);
          const toNode = network.nodes.find(node => node.id === networkEdge.to_vertex_id);
          err.edges.push([fromNode, toNode]);
        });
      });
      this.validationErrors.next(errors);
    }, error => {
      if (error.status === 401) {
        window.open(this.projectData.gcs_login_url, '_blank');
      }
      console.log(error);
    }, () => this.loaderService.hide());
  }

  onLogoutClicked(): void {
    this.authService.logout().subscribe((auth) => {
      if (auth.success) {
        this.router.navigate([auth.redirect], {});
      }
    });
  }

  onBackClicked(): void {
    this.router.navigate(['/projects'], {});
  }

  onHelpClicked(): void {
    this.dialog.open(HelpDialogComponent);
  }

  getToolbarBottom(): string {
    if (this.errorViewer == null || this.errorViewer?.isHidden) {
      return '40px';
    } else {
      return '240px';
    }
  }

  tileProgressListener = (tilesToLoad) => {
    if (tilesToLoad > 0) {
      return;
    } else {
      this.onMapReady().then(() => console.log('map loaded'));
    }
  }
}
