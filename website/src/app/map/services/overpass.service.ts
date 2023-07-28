import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IOSMBuilding, OSMBuilding} from '../models/osm-building';
import {OsmResponse} from '../models/osm-response';
import {environment} from '../../../environments/environment';
import {map} from 'rxjs/operators';
import {SurveyStoreService} from './survey-store.service';
import {IBuildingService} from './buildings.service';

const OVERPASS_URL = environment.overpassUrl;

@Injectable()
export class OverpassService implements IBuildingService {
  constructor(private httpClient: HttpClient, private surveyStore: SurveyStoreService) {
  }

  fetchBuildings(polygon: string, surveyId: string): Observable<OsmResponse<OSMBuilding>> {
    const query = `[out:json];way(poly:"${polygon}")["building"];(._;);out center qt;`;
    const params = new HttpParams().set('data', query);
    return this.httpClient.post<OsmResponse<IOSMBuilding>>(OVERPASS_URL, params).pipe(
      map(response => {
        const buildings = response.elements.map(building => {
          building.surveyId = surveyId;
          building.gcsId = this.surveyStore.getNodeCount();
          return new OSMBuilding(building);
        });
        const mappedResponse: OsmResponse<OSMBuilding> = {
          generator: response.generator,
          version: response.version,
          elements: buildings
        };
        return mappedResponse;
      })
    );
  }
}
