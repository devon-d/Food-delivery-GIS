import {EditPoint} from 'angular-cesium';

declare module 'angular-cesium/lib/angular-cesium-widgets/models/edit-point' {
  import {AcEntity} from 'angular-cesium';

  export interface EditPoint {
    nodeId?: string;
    boundTo?: EditPoint[];
    secondaryMarker?: AcEntity;
    flightAltitude?: number;
  }
}
