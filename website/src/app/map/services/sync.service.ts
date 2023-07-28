import {Injectable} from '@angular/core';
import {BuildingActionType, NetworkActionType, SurveyActionType, SurveyStoreService} from './survey-store.service';
import {BaseEdit, EditMode} from '../models/edits/base-edit';
import {PolygonEdit} from '../models/edits/polygon-edit';
import {Observable, of, Subject, Subscription} from 'rxjs';
import {BulkBuildingEdit} from '../models/edits/bulk-building-edit';
import {BuildingEdit, BuildingEditProps} from '../models/edits/building-edit';
import {bufferTime, catchError, concatMap, filter, retryWhen} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {ApiResponse} from '../../common/util/api-response';
import {InterceptorHttpParams} from '../../common/util/interceptor-http-params';
import {genericRetryStrategy} from '../../common/util/generic-retry-strategy';
import {OSMBuilding} from '../models/osm-building';
import {NetworkEdit, NetworkEditProps} from '../models/edits/network-edit';

export enum SyncStatus {
  SYNCING = ('Syncing'),
  SYNCED = ('Synced')
}

export interface SyncUpdate {
  syncStatus: SyncStatus;
  pendingCount: number;
}

@Injectable()
// @ts-ignore
export class SyncService {
  private syncUpdates = new Subject<SyncUpdate>();
  private queue = new Subject<BaseEdit<any>>();
  private maxEntries = 5;
  private waitTime = 3000;
  private projectId = -1;
  private subscriptions: Subscription = new Subscription();
  private queueCount = 0;

  readonly queue$ = this.queue.asObservable();
  readonly syncUpdates$ = this.syncUpdates.asObservable();

  constructor(
    private store: SurveyStoreService,
    private httpClient: HttpClient) {
  }

  start(projectId: number): void {
    this.projectId = projectId;
    this.subscribeEdits();
    const queueSubscription = this.queue$.pipe(
      bufferTime(this.waitTime, null, this.maxEntries),
      filter(edits => edits.length > 0)
    ).pipe(
      concatMap((edits) => this.sendBatchRequest(edits)),
    ).subscribe((batchResponse) => {
      if (batchResponse.success) {
        this.queueCount = this.queueCount - batchResponse.data.editCount;
        this.sendSyncUpdate();
      } else {
        console.log('Failed to save edit: ', batchResponse);
      }
    });
    this.subscriptions.add(queueSubscription);
  }

  stop(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeEdits(): void {
    const surveyActionSubscription = this.store.surveyAction$.subscribe((action) => {
      // add polygon to table
      const actionType = action.type;
      const survey = action.payload;
      switch (actionType) {
        case SurveyActionType.CREATE_POLYGON: {
          // create polygon edit for the survey
          const polygonEdit = new PolygonEdit(EditMode.CREATE, {
            id: survey.id,
            polygon: survey.getPositionsInDegrees()
          });
          this.enqueueEdit(polygonEdit);
          break;
        }
        case SurveyActionType.UPDATE_POLYGON: {
          const polygonUpdateEdit = new PolygonEdit(EditMode.UPDATE, {
            id: survey.id,
            polygon: survey.getPositionsInDegrees()
          });
          this.enqueueEdit(polygonUpdateEdit);
          break;
        }
        case SurveyActionType.DELETE_POLYGON: {
          // create polygon edit for the survey
          const polygonEdit = new PolygonEdit(EditMode.DELETE, {
            id: survey.id
          });
          this.enqueueEdit(polygonEdit);
          break;
        }
        case SurveyActionType.TOGGLE_LOCK: {
          const buildings = survey.getBuildings();
          if (buildings == null || buildings.length === 0) {
            return;
          }
          // create building edits
          const buildingEdits: BuildingEditProps[] = buildings.map(building => {
            return {
              id: building.uuid,
              osm_id: building.id,
              survey_id: building.surveyId,
              locked: building.locked,
              location: building.getLngLat()
            };
          });
          const bulkEdit = new BulkBuildingEdit(EditMode.UPDATE, buildingEdits);
          this.enqueueEdit(bulkEdit);
          break;
        }
        case SurveyActionType.CREATE_BUILDINGS: {
          const buildings = survey.getBuildings();
          if (buildings == null) {
            return;
          }
          // create building edits
          const buildingEdits: BuildingEditProps[] = buildings.map(building => {
            return {
              id: building.uuid,
              osm_id: building.id,
              address: building.address,
              survey_id: building.surveyId,
              locked: building.locked,
              location: building.getLngLat()
            };
          });
          const bulkEdit = new BulkBuildingEdit(EditMode.CREATE, buildingEdits);
          this.enqueueEdit(bulkEdit);
          break;
        }
        case SurveyActionType.DELETE_BUILDINGS: {
          const buildings = survey.getBuildings();
          if (buildings == null) {
            return;
          }
          // create building edits
          const buildingEdits: BuildingEditProps[] = buildings.map(building => {
            return {
              id: building.uuid,
              osm_id: building.id,
              survey_id: building.surveyId,
              location: building.getLngLat()
            };
          });
          const bulkEdit = new BulkBuildingEdit(EditMode.DELETE, buildingEdits);
          this.enqueueEdit(bulkEdit);
          break;
        }
      }
      this.sendSyncUpdate();
    });

    const buildingActionSubscription = this.store.buildingAction$.subscribe((action) => {
      // add polygon to table
      const actionType = action.type;
      const building: OSMBuilding = action.payload;
      switch (actionType) {
        case BuildingActionType.CREATE: {
          const buildingEdit = new BuildingEdit(EditMode.CREATE, {
            id: building.uuid,
            osm_id: building.id,
            survey_id: building.surveyId,
            location: building.getLngLat()
          });
          this.enqueueEdit(buildingEdit);
          break;
        }
        case BuildingActionType.DELETE: {
          const buildingEdit = new BuildingEdit(EditMode.DELETE, {
            id: building.uuid,
            osm_id: building.id,
            survey_id: building.surveyId,
            location: building.getLngLat()
          });
          this.enqueueEdit(buildingEdit);
          break;
        }
        case BuildingActionType.UPDATE_LOCATION: {
          const buildingEdit = new BuildingEdit(EditMode.UPDATE, {
            id: building.uuid,
            osm_id: building.id,
            survey_id: building.surveyId,
            location: building.getLngLat(),
            flight_altitude: building.flightAltitude
          });
          this.enqueueEdit(buildingEdit);
          break;
        }
        case BuildingActionType.TOGGLE_LOCK: {
          const buildingEdit = new BuildingEdit(EditMode.UPDATE, {
            id: building.uuid,
            osm_id: building.id,
            survey_id: building.surveyId,
            locked: building.locked,
            location: building.getLngLat()
          });
          this.enqueueEdit(buildingEdit);
          break;
        }
        case BuildingActionType.UPDATE_ADDRESS: {
          const buildingEdit = new BuildingEdit(EditMode.UPDATE, {
            id: building.uuid,
            osm_id: building.id,
            survey_id: building.surveyId,
            address: building.address,
            location: building.getLngLat()
          });
          this.enqueueEdit(buildingEdit);
          break;
        }
      }
      this.sendSyncUpdate();
    });

    const networkActionSubscription = this.store.networkAction$.subscribe((action) => {
      // add polygon to table
      const actionType = action.type;
      const network: NetworkEditProps = action.payload;
      if (actionType === NetworkActionType.CREATE) {
        const networkEdit = new NetworkEdit(EditMode.CREATE, network);
        this.enqueueEdit(networkEdit);
      }
      this.sendSyncUpdate();
    });

    this.subscriptions.add(surveyActionSubscription).add(buildingActionSubscription).add(networkActionSubscription);
  }

  private sendBatchRequest(edits: BaseEdit<any>[]): Observable<ApiResponse<any>> {
    const jsonArr = edits.map(edit => edit.parse());
    return this.httpClient.post<ApiResponse<any>>(`${environment.apiUrl}/project/${this.projectId}/edit`, jsonArr, {
      withCredentials: true,
      params: new InterceptorHttpParams({showProgress: false})
    }).pipe(
      retryWhen(genericRetryStrategy({
        maxRetryAttempts: Infinity
      })),
      catchError(error => of(error))
    );
  }

  private enqueueEdit(edit: BaseEdit<any>): void {
    this.queue.next(edit);
    this.queueCount++;
  }

  private sendSyncUpdate(): void {
    if (this.queueCount <= 0) {
      this.syncUpdates.next({
        syncStatus: SyncStatus.SYNCED,
        pendingCount: 0
      });
    } else {
      this.syncUpdates.next({
        syncStatus: SyncStatus.SYNCING,
        pendingCount: this.queueCount
      });
    }
  }
}
