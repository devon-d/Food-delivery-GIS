import {Cartesian3, EditPoint} from 'angular-cesium';

export interface ManualPoint {
  position: Cartesian3;
  hookPoint?: EditPoint;
}
