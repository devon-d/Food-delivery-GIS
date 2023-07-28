import {Injectable} from '@angular/core';
import {SurveyArea} from '../models/survey-area';
import {IOSMBuilding, OSMBuilding} from '../models/osm-building';
import {Cartesian3} from 'angular-cesium';
import {Subject} from 'rxjs';
import * as turf from '@turf/turf';
import {Util} from '../util';
import {cloneDeep} from 'lodash';
import {NetworkEditProps} from '../models/edits/network-edit';
import {ReadFile} from 'ngx-file-helpers';
import {ISurveyArea} from '../../project/models/project';

export enum SurveyActionType {
  CREATE_POLYGON,
  UPDATE_POLYGON,
  DELETE_POLYGON,
  CREATE_BUILDINGS,
  DELETE_BUILDINGS,
  TOGGLE_LOCK,
  SET_VISIBILITY
}

export enum BuildingActionType {
  CREATE,
  DELETE,
  UPDATE_LOCATION, UPDATE_ADDRESS, UPDATE_NETWORK_LINK,
  TOGGLE_LOCK,
  FOCUS,
  UNFOCUS
}

export enum NetworkActionType {
  CREATE,
  EDIT,
  DELETE
}

export interface Action<A, P> {
  type: A;
  payload: P;
  zoom?: boolean;
}

type BuildingAction = Action<BuildingActionType, OSMBuilding>;
type SurveyAction = Action<SurveyActionType, SurveyArea>;
type NetworkAction = Action<NetworkActionType, NetworkEditProps>;

@Injectable()
export class SurveyStoreService {
  readonly surveys: SurveyArea[] = [];
  private placeholderSurvey: SurveyArea;
  private surveyActionSource = new Subject<SurveyAction>();
  private buildingActionSource = new Subject<BuildingAction>();
  private networkActionSource = new Subject<NetworkAction>();
  private focusedBuilding?: OSMBuilding;
  private currentNodeCount = 0;

  surveyAction$ = this.surveyActionSource.asObservable();
  buildingAction$ = this.buildingActionSource.asObservable();
  networkAction$ = this.networkActionSource.asObservable();

  addSurvey(polygonPositions: Cartesian3[], id?: string, buildings?: OSMBuilding[]): SurveyArea {
    const survey = new SurveyArea(polygonPositions, id, buildings);
    this.surveys.push(survey);

    this.surveyActionSource.next({
      type: SurveyActionType.CREATE_POLYGON,
      payload: survey
    });
    return survey;
  }

  setSurveysVisibility(visible: boolean): void {
    this.surveys.forEach(survey => {
      survey.show = visible;
      this.surveyActionSource.next({
        type: SurveyActionType.SET_VISIBILITY,
        payload: survey
      });
    });
  }

  deleteSurvey(id: string): void {
    // find by survey id
    const index = this.surveys.findIndex((survey) => {
      return survey.id === id;
    });

    // delete
    if (index !== -1) {
      const removedSurvey = this.surveys.splice(index, 1)[0];
      if (removedSurvey) {
        if (this.focusedBuilding?.surveyId === removedSurvey.id) {
          this.focusedBuilding = null;
        }
        this.surveyActionSource.next({
          type: SurveyActionType.DELETE_POLYGON,
          payload: removedSurvey
        });
      }
    }
  }

  getSurvey(id: string): SurveyArea {
    return this.surveys.find((sur) => {
      return sur.id === id;
    });
  }

  setSurveyBounds(surveyId: string, cartesian: Cartesian3[]): void {
    const survey = this.getSurvey(surveyId);
    if (survey) {
      survey.setPolygonPositions(cartesian);
      this.surveyActionSource.next({
        type: SurveyActionType.UPDATE_POLYGON,
        payload: survey
      });
    }
  }

  isPlaceholderSurvey(surveyId: string): boolean {
    return surveyId === this.getPlaceholderSurvey()?.id;
  }

  getPlaceholderSurvey(): SurveyArea {
    return this.placeholderSurvey;
  }

  // Only creates one instance per project. Noop if instance already exists
  createPlaceholderSurvey(id?: string, buildings?: OSMBuilding[]): SurveyArea {
    if (this.getPlaceholderSurvey() == null) {
      const survey = new SurveyArea([], id, buildings);
      this.placeholderSurvey = survey;
      this.surveys.push(survey);
      this.surveyActionSource.next({
        type: SurveyActionType.CREATE_POLYGON,
        payload: survey
      });
      return survey;
    }
  }

  getNodeCount(): number {
    return this.currentNodeCount++;
  }

  setFocusedBuilding(building: OSMBuilding, zoom: boolean): void {
    if (this.focusedBuilding) {
      this.buildingActionSource.next({
        type: BuildingActionType.UNFOCUS,
        payload: this.focusedBuilding
      });
    }
    this.focusedBuilding = building;
    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.FOCUS,
        payload: this.focusedBuilding,
        zoom
      });
    }
  }

  getFocusedBuilding(): OSMBuilding {
    return this.focusedBuilding;
  }

  getAllBuildings(): OSMBuilding[] {
    const buildings = [];
    this.surveys.forEach(survey => {
      const surveyBuildings = survey.getBuildings();
      if (surveyBuildings != null) {
        buildings.push(...surveyBuildings);
      }
    });
    return buildings;
  }

  getLinkedBuildings(): OSMBuilding[] {
    const buildings = [];
    this.surveys.forEach(survey => {
      const surveyBuildings = survey.getBuildings()?.filter(building =>
        building.locked && building.linkPositions && building.linkPositions.length > 1);
      if (surveyBuildings != null && surveyBuildings.length > 0) {
        buildings.push(...surveyBuildings);
      }
    });
    return buildings;
  }

  getLockedBuildingPoints(): OSMBuilding[] {
    const buildings = [];
    this.surveys.forEach(survey => {
      const surveyBuildings = survey.getBuildings().filter(building => building.locked);
      if (surveyBuildings != null && surveyBuildings.length > 0) {
        buildings.push(...surveyBuildings);
      }
    });
    return buildings;
  }

  getBuildingsByGCSIds(surveyId: string, buildingIDs: number[]): OSMBuilding[] {
    const buildings = [];
    const survey = this.getSurvey(surveyId);
    const surveyBuildings = survey.getBuildings();
    buildingIDs.forEach(id => {
      const building = surveyBuildings?.find(b => b.gcsId === id);
      if (building) {
        buildings.push(building);
      }
    });
    return buildings;
  }

  setBuildings(surveyId: string, osmBuildings: OSMBuilding[]): void {
    const survey = this.getSurvey(surveyId);

    this.surveyActionSource.next({
      type: SurveyActionType.DELETE_BUILDINGS,
      payload: cloneDeep(survey)
    });

    survey?.setBuildings(osmBuildings);
    this.surveyActionSource.next({
      type: SurveyActionType.CREATE_BUILDINGS,
      payload: survey
    });
  }

  addBuilding(surveyId: string, building: OSMBuilding): void {
    const survey = this.getSurvey(surveyId);
    survey.addBuilding(building);
    this.buildingActionSource.next({
      type: BuildingActionType.CREATE,
      payload: building
    });
  }

  deleteBuilding(surveyId: string, buildingId: string): void {
    const survey = this.getSurvey(surveyId);
    const deletedBuilding = survey.deleteBuilding(buildingId);
    if (deletedBuilding) {
      this.buildingActionSource.next({
        type: BuildingActionType.DELETE,
        payload: deletedBuilding
      });
    }
  }

  updateBuildingAddress(surveyId: string, buildingId: string, address: string): void {
    const building = this.getSurvey(surveyId)?.updateBuildingAddress(buildingId, address);

    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.UPDATE_ADDRESS,
        payload: building
      });
    }
  }

  updateBuildingLink(survey: string | SurveyArea, buildingId: string, linkPositions: Cartesian3[], linkAlt: number): void {
    let building: OSMBuilding;
    if (survey instanceof SurveyArea) {
      building = survey?.updateBuildingLink(buildingId, linkPositions, linkAlt);
    } else {
      building = this.getSurvey(survey)?.updateBuildingLink(buildingId, linkPositions, linkAlt);
    }

    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.UPDATE_NETWORK_LINK,
        payload: building
      });
    }
  }

  lockBuildingPosition(survey: string | SurveyArea, buildingId: string): void {
    let building: OSMBuilding;
    if (survey instanceof SurveyArea) {
      building = survey?.lockBuildingPosition(buildingId);
    } else {
      building = this.getSurvey(survey)?.lockBuildingPosition(buildingId);
    }
    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.TOGGLE_LOCK,
        payload: building
      });
    }
  }

  updateBuildingPosition(survey: string | SurveyArea, buildingId: string, position: Cartesian3, flightAltitude: number): OSMBuilding {
    let building: OSMBuilding;
    if (survey instanceof SurveyArea) {
      building = survey?.updateBuildingPosition(buildingId, position, flightAltitude);
    } else {
      survey = this.getSurvey(survey);
      building = survey?.updateBuildingPosition(buildingId, position, flightAltitude);
    }
    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.UPDATE_LOCATION,
        payload: building
      });
    }
    return building;
  }

  unlockBuildingPosition(survey: string | SurveyArea, buildingId: string): void {
    let building: OSMBuilding;
    if (survey instanceof SurveyArea) {
      building = survey?.unlockBuildingPosition(buildingId);
    } else {
      survey = this.getSurvey(survey);
      building = survey?.unlockBuildingPosition(buildingId);
    }

    if (building) {
      this.buildingActionSource.next({
        type: BuildingActionType.TOGGLE_LOCK,
        payload: building
      });
      // remove link because unlocked buildings can't be linked
      this.updateBuildingLink(survey, buildingId, null, null);
    }
  }

  lockAllSurveys(): void {
    this.surveys.forEach((survey) => {
      survey.lockAllBuildings();
      this.surveyActionSource.next({
        type: SurveyActionType.TOGGLE_LOCK,
        payload: survey
      });
    });
  }

  unlockAllSurveys(): void {
    this.surveys.forEach((survey) => {
      survey.unlockAllBuildings();
      this.surveyActionSource.next({
        type: SurveyActionType.TOGGLE_LOCK,
        payload: survey
      });
    });
  }

  saveNetwork(network: NetworkEditProps): void {
    this.networkActionSource.next({
      type: NetworkActionType.CREATE,
      payload: network
    });
  }

  importSurveysFromGeoJSON(file: ReadFile): void {
    const featureCollection = JSON.parse(file.content);
    // iterate through features
    featureCollection.features.forEach(feature => {
      let coordinates = [];
      const type = feature.geometry.type.toLowerCase();
      if (type === 'polygon') {
        coordinates = [...feature.geometry.coordinates[0]];
      } else if (type === 'multipolygon') {
        feature.geometry?.coordinates.forEach(coordArray => {
          coordinates.push(...coordArray[0]);
        });
      }
      if (coordinates && coordinates.length > 3) {
        const polygonCartesian = Util.lngLatArrayToCartesian(coordinates);
        // add cartesian coordinates of polygon on map
        this.addSurvey(polygonCartesian, null, []);
      }
    });
  }

  importSurveys(surveys: ISurveyArea[]): void {
    surveys.forEach(survey => {
      const buildings = survey.buildings.map(building => {
        const osmBuilding: IOSMBuilding = {
          uuid: building.id,
          id: building.osm_id,
          surveyId: survey.id,
          center: {
            lon: building.location[0],
            lat: building.location[1]
          },
          flightAltitude: building.flight_altitude,
          address: building.address,
          locked: building.locked,
          gcsId: this.getNodeCount()
        };
        return new OSMBuilding(osmBuilding);
      });
      if (survey.polygon == null || survey.polygon.length === 0) {
        this.createPlaceholderSurvey(survey.id, buildings);
      } else {
        const cartArr = Util.lngLatArrayToCartesian(survey.polygon);
        this.addSurvey(cartArr, survey.id, buildings);
      }
    });
  }

  exportSurveys(): void {
    const features = [];
    this.surveys.forEach((survey, index) => {
      if (survey.id !== this.getPlaceholderSurvey()?.id) {
        // polygon
        const polygonPoints = survey.getPolygonPositions().map(position => {
          const carto = Cesium.Cartographic.fromCartesian(position);
          return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude), carto.height];
        });
        polygonPoints.push(polygonPoints[0]);
        const polygon = turf.feature(turf.geometry('Polygon', [polygonPoints]), {
          name: `polygon-${index}`
        });
        features.push(polygon);
      }

      // points
      let surveyBuildings = [];
      if (survey.getBuildings()) {
        surveyBuildings = survey.getBuildings().map(building => {
          return turf.feature(turf.geometry('Point', [building.center.lon, building.center.lat]), {
            belongsTo: `polygon-${index}`,
            building
          });
        });
        features.push(...surveyBuildings);
      }
    });

    // download
    Util.downloadJSON(turf.featureCollection(features), 'survey.json');
  }
}
