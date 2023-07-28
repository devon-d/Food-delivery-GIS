import {Cartesian3} from 'angular-cesium';
import {v4 as uuidv4} from 'uuid';
import {Location} from './location';

export interface Tags {
  'addr:full': string;
  'addr:state': string;
  'addr:city': string;
  'addr:housenumber': string;
  'addr:postcode': string;
  'addr:street': string;
  'building': string;
  'height': string;
  'name': string;
  'alt_name': string;
}

// export class OSMBuilding {
//   type: string;
//   id: number;
//   center: Center;
//   tags: Tags;
//   locked: boolean;
// }

export interface IOSMBuilding {
  uuid: string;
  id: number; // osm id
  gcsId: number; // for identifying gcs errors
  surveyId: string;
  center: Location;
  flightAltitude?: number;
  address?: string;
  locked?: boolean;
  linkPositions?: Cartesian3[];
  linkAltitude?: number;
}

export class OSMBuilding implements IOSMBuilding {
  uuid: string;
  id: number; // osm id
  gcsId: number;
  surveyId: string;
  center: Location;
  flightAltitude?: number;
  address?: string;
  locked?: boolean;
  linkPositions?: Cartesian3[];
  linkAltitude?: number;

  constructor(props: IOSMBuilding) {
    Object.assign(this, props);
    if (!this.uuid) {
      this.uuid = uuidv4();
    }
  }

  getLngLat(): number[] {
    return [this.center.lon, this.center.lat];
  }
}
