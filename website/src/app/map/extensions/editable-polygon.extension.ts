import {EditablePolygon} from 'angular-cesium';
import {Util} from '../util';

EditablePolygon.prototype.getDegreesArray = function(): any {
  return this.getRealPoints().map(point => {
    const cartographic = Cesium.Cartographic.fromCartesian(point.getPosition());
    return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), cartographic.height];
  });
};

EditablePolygon.prototype.getPolyForOSM = function(): string {
  return Util.getPolyForOSM(this.getRealPoints().map(point => point.getPosition()));
};

EditablePolygon.prototype.getPolyForPostGIS = function(): string {
  return Util.getPolyForPostGIS(this.getRealPoints().map(point => point.getPosition()));
};
