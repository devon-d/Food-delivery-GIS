import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {MatTable, MatTableDataSource} from '@angular/material/table';
import {CesiumService, MapsManagerService} from 'angular-cesium';
import {OSMBuilding} from '../../models/osm-building';
import {SurveyArea} from '../../models/survey-area';
import {BuildingActionType, SurveyActionType, SurveyStoreService} from '../../services/survey-store.service';
import {GeoapifyService} from '../../services/geoapify.service';
import {ReverseGeocodeInput} from '../../models/reverse-geocode-input';
import {Util} from '../../util';
import {AuthService} from '../../../auth/auth.service';
import {Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {AlertDialogComponent} from '../../../common/alert-dialog/alert-dialog.component';
import {concatMap} from 'rxjs/operators';
import {of} from 'rxjs';
import {BuildingServiceType, BuildingsService} from '../../services/buildings.service';
import {VirtualScrollerComponent} from 'ngx-virtual-scroller';


@Component({
  selector: 'app-survey-table',
  templateUrl: './survey-table.component.html',
  styleUrls: ['./survey-table.component.css'],
  providers: [CesiumService]
})
export class SurveyTableComponent implements OnInit {
  Util = Util;

  @Input() mapService: MapsManagerService;
  polygonColumns = ['position', 'name', 'points', 'actions'];
  pointColumns = ['No.', 'Address', 'Status', 'Actions'];
  pointActions = ['Show'];

  polygonDataSource = new MatTableDataSource<SurveyArea>();
  locationsDataSource: OSMBuilding[] = [];
  locationsViewportItems: OSMBuilding[] = [];

  @ViewChild('polygonsTable') polygonsTable: MatTable<SurveyArea>;
  @ViewChild('locationsList') locationsList: VirtualScrollerComponent;

  private autoScrollEnabled = true;
  allLocationsLocked = false;

  // @ViewChild('locationsPaginator') locationsPaginator: MatPaginator;

  constructor(private router: Router,
              private store: SurveyStoreService,
              private authService: AuthService,
              private buildingsService: BuildingsService,
              private geoapifyService: GeoapifyService,
              private dialog: MatDialog) {
  }


  ngOnInit(): void {
    // for auto-focusing a particular row
    this.store.buildingAction$.subscribe((action) => {
      const actionType = action.type;
      const building = action.payload;
      switch (actionType) {
        case BuildingActionType.CREATE: {
          this.addBuildings([building]);
          break;
        }
        case BuildingActionType.DELETE: {
          this.removeBuilding(building.uuid);
          break;
        }
        case BuildingActionType.FOCUS: {
          const index = this.locationsDataSource.indexOf(building);
          this.focusRow(index);
          break;
        }
        case BuildingActionType.UNFOCUS: {
          const index = this.locationsDataSource.indexOf(building);
          if (index !== -1) {
            this.unFocusRow(index);
          }
          break;
        }
      }
    });

    this.store.surveyAction$.pipe(concatMap((value) => of(value)))
      .subscribe((action) => {
        // add polygon to table
        const actionType = action.type;
        const survey = action.payload;
        switch (actionType) {
          case SurveyActionType.CREATE_POLYGON: {
            if (!(survey.id === this.store.getPlaceholderSurvey()?.id)) {
              this.polygonDataSource.data.push(survey);
              this.polygonsTable.renderRows();
            }
            const buildings = survey.getBuildings();
            if (buildings) {
              this.addBuildings(buildings);
            }
            break;
          }
          case SurveyActionType.DELETE_POLYGON: {
            // find survey index in table data
            const index = this.polygonDataSource.data.indexOf(survey);
            if (index !== -1) {
              // delete survey
              const deletedSurvey = this.polygonDataSource.data.splice(index, 1)[0];
              this.polygonsTable.renderRows();
              // delete it's buildings
              this.removeBuildings(deletedSurvey.id);
            }
            break;
          }
          case SurveyActionType.CREATE_BUILDINGS: {
            const buildings = survey.getBuildings();
            if (buildings == null) {
              return;
            }
            // remove previous buildings for the survey
            this.removeBuildings(survey.id);

            // add new buildings
            this.addBuildings(buildings);
            // this.locationsDataSource.paginator = this.locationsPaginator;
            break;
          }
        }
      });
  }

  removeBuildings(surveyId: string): void {
    this.locationsDataSource = this.locationsDataSource.filter(building => building.surveyId !== surveyId);
  }

  removeBuilding(buildingId: string): void {
    const index = this.locationsDataSource.findIndex(building => building.uuid === buildingId);
    this.locationsDataSource.splice(index, 1);
    this.locationsDataSource = [...this.locationsDataSource];
  }

  addBuildings(buildings: OSMBuilding[]): void {
    this.locationsDataSource.push(...buildings);
  }

  trackLocationsBy(index: number, building: OSMBuilding): string {
    return building.uuid;
  }

  focusRow(index: number): void {
    if (index < 0 || index >= this.locationsDataSource.length) {
      return;
    }
    const building = this.locationsDataSource[index];
    if (this.autoScrollEnabled) {
      this.locationsList.scrollToIndex(index, true, null, 0);
      setTimeout(() => {
        const rowFound = document.getElementById(building.uuid);
        if (rowFound) {
          rowFound.className = 'selected-row';
        }
      }, 300);
      // rowFound?.scrollIntoView({block: 'nearest', inline: 'start'});
    } else {
      this.autoScrollEnabled = true;
    }
  }

  unFocusRow(index: number): void {
    const uuid = this.locationsDataSource[index].uuid;
    const rowFound = document.getElementById(uuid);
    if (rowFound) {
      rowFound.className = '';
    }
  }

  onLockToggled(): void {
    if (!this.allLocationsLocked) {
      AlertDialogComponent.show(this.dialog, {
        title: 'Are you sure?',
        msg: 'Do you really want to lock all locations?',
        positiveText: 'Lock All Locations',
        negativeText: 'Cancel'
      }).subscribe(positive => {
        if (positive) {
          this.store.lockAllSurveys();
          this.allLocationsLocked = !this.allLocationsLocked;
        }
      });
    } else {
      AlertDialogComponent.show(this.dialog, {
        title: 'Are you sure?',
        msg: 'Do you really want to unlock all locations? This action will also delete network links',
        positiveText: 'Unlock All Locations',
        negativeText: 'Cancel'
      }).subscribe(positive => {
        if (positive) {
          this.store.unlockAllSurveys();
          this.allLocationsLocked = !this.allLocationsLocked;
        }
      });
    }
  }

  onFetchAddressClicked(): void {
    const geocodeInputs = [];
    // find buildings with missing addresses and convert them to geocode inputs format
    this.store.surveys.forEach(survey => {
      survey.getBuildings()?.forEach(building => {
        if (building.address == null) {
          const geocodeInput: ReverseGeocodeInput = {
            id: `${survey.id}/${building.uuid}`,
            params: {
              lat: building.center.lat,
              lon: building.center.lon
            }
          };
          geocodeInputs.push(geocodeInput);
        }
      });
    });

    if (geocodeInputs.length === 0) {
      return;
    }

    // fetch addresses for geocode inputs
    this.geoapifyService.fetchMissingAddresses(geocodeInputs).subscribe((geoCodes) => {
      geoCodes.forEach(geocode => {
        const ids = geocode.id.split('/');
        if (ids.length === 2) {
          this.store.updateBuildingAddress(ids[0], ids[1], geocode.address);
        }
      });
    }, error => {
      console.log(error);
    });
  }

  showPolygon(survey: SurveyArea): void {
    // TODO: write a common code for show/query/delete polygon
    const enclosedPositions = [...survey.getPolygonPositions()];
    this.mapService.getMap().getCesiumViewer().camera.flyToBoundingSphere(
      new Cesium.BoundingSphere.fromPoints(enclosedPositions), {
        duration: 1,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90.0), 0)
      });
  }

  deletePolygon(survey: SurveyArea): void {
    AlertDialogComponent.show(this.dialog, {
      title: 'Are you sure?',
      msg: 'This action will delete the polygon and the building points associated with it',
      positiveText: 'Delete',
      negativeText: 'Cancel'
    }).subscribe(positive => {
      if (positive) {
        this.store.deleteSurvey(survey.id);
      }
    });
  }

  queryPolygon(survey: SurveyArea, provider: BuildingServiceType): void {
    const query = () => {
      const poly = provider === 'overpass' ? Util.getPolyForOSM(survey.getPolygonPositions()) :
        Util.getPolyForPostGIS(survey.getPolygonPositions());
      this.buildingsService.mode = provider;
      this.buildingsService.fetchBuildings(poly, survey.id).subscribe((response) => {
        this.store.setBuildings(survey.id, response.elements);
      }, (error) => console.log(error));
    };
    if (survey.getBuildings() && survey.getBuildings().length > 0) {
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
  }

  onLocationActionClicked(actionName: string, building: OSMBuilding): void {
    if (actionName === 'Show') {
      const survey = this.store.surveys.find((sur) => {
        return sur.getBuildings()?.indexOf(building) !== -1;
      });
      if (survey) {
        this.autoScrollEnabled = false;
        this.store.setFocusedBuilding(building, true);
      }
    }
  }

  getBuildingsCount(survey: SurveyArea): number {
    return survey.getBuildings()?.length || 0;
  }
}
