import {Observable} from 'rxjs';
import {OsmResponse} from '../models/osm-response';
import {OSMBuilding} from '../models/osm-building';
import {OverpassService} from './overpass.service';
import {HttpClient} from '@angular/common/http';
import {SurveyStoreService} from './survey-store.service';
import {OpenAddressesService} from './open-addresses.service';
import {Injectable} from '@angular/core';

export interface IBuildingService {
  fetchBuildings: ((polygon: string, surveyId: string) => Observable<OsmResponse<OSMBuilding>>);
}

export type BuildingServiceType = 'overpass' | 'open-addresses';

@Injectable()
export class BuildingsService implements IBuildingService {
  private currentService: IBuildingService;
  private modeValue: BuildingServiceType;

  constructor(private httpClient: HttpClient, private surveyStore: SurveyStoreService) {
    this.mode = 'overpass';
  }

  get mode(): BuildingServiceType {
    return this.modeValue;
  }

  set mode(value: BuildingServiceType) {
    this.modeValue = value;
    switch (value) {
      case 'overpass':
        this.currentService = new OverpassService(this.httpClient, this.surveyStore);
        break;
      case 'open-addresses':
        this.currentService = new OpenAddressesService(this.httpClient, this.surveyStore);
    }
  }

  fetchBuildings = (polygon: string, surveyId: string) => {
    return this.currentService.fetchBuildings(polygon, surveyId);
  }
}
