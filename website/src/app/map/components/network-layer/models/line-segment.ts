import {Cartesian3} from 'angular-cesium';
import {Feature, LineString} from '@turf/helpers/dist/js/lib/geojson';

export interface BuildingLink {
  surveyId: string;
  buildingId: string;
  linkPositions?: Cartesian3[];
  flightAltitude?: number;
}

export interface LineSegment {
  polyIndex: number;
  pointIndex: number;
  positions: Cartesian3[];
  flightAlts: number[];
  lineString: Feature<LineString, any>;
  links: Map<string, BuildingLink>;
}
