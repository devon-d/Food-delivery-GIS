import {EditablePolygon} from 'angular-cesium';

declare module 'angular-cesium/lib/angular-cesium-widgets/models/editable-polygon' {
  export interface EditablePolygon {
    getDegreesArray(): any;
    getPolyForOSM(): string;
    getPolyForPostGIS(): string;
  }
}
