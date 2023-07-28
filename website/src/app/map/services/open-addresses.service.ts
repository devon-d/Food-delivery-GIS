import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OSMBuilding} from '../models/osm-building';
import {OsmResponse} from '../models/osm-response';
import {environment} from '../../../environments/environment';
import {map} from 'rxjs/operators';
import {SurveyStoreService} from './survey-store.service';
import {IBuildingService} from './buildings.service';
import {ApiResponse} from '../../common/util/api-response';

const API_URL = environment.apiUrl;

@Injectable()
export class OpenAddressesService implements IBuildingService {
  private readonly baseUrl = `${API_URL}/address`;

  constructor(private httpClient: HttpClient, private surveyStore: SurveyStoreService) {
  }

  fetchBuildings(polygon: string, surveyId: string): Observable<OsmResponse<OSMBuilding>> {
    const params = new HttpParams().set('polygon', polygon);
    return this.httpClient.post<ApiResponse<OSMBuilding[]>>(`${this.baseUrl}/filter`, params, {withCredentials: true}).pipe(
      map(response => {
        const buildings = response.data.map(building => {
          building.surveyId = surveyId;
          building.gcsId = this.surveyStore.getNodeCount();
          return new OSMBuilding(building);
        });
        const mappedResponse: OsmResponse<OSMBuilding> = {
          generator: 'open_addresses',
          version: 1.0,
          elements: buildings
        };
        return mappedResponse;
      })
    );
  }
}
