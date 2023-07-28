import {OSMBuilding} from './models/osm-building';
import {Cartesian3, CesiumEvent, CesiumEventModifier, PolygonEditOptions} from 'angular-cesium';
import {Cartographic, Scene, TerrainProvider} from 'cesium';
import {Location} from './models/location';

export const DEFAULT_POLYGON_EDIT_OPTIONS: PolygonEditOptions = {
  clampHeightTo3D: true,
  clampHeightTo3DOptions: {
    clampToTerrain: true, // Default: false (if true will only clamp to terrain)
    clampMostDetailed: true, // Fix height after finish editing
    clampToHeightPickWidth: 1 // scene.clampToHeight() width , 3dTiles only
  },
  removePointEvent: CesiumEvent.RIGHT_CLICK,
  removePointModifier: CesiumEventModifier.CTRL,
};

export class Util {
  static getPolyForOSM(cartesianArray: Cartesian3[]): string {
    let poly = '';
    const degreesArray = cartesianArray.map(cartesian => {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), cartographic.height];
    });
    degreesArray.forEach((latLngHgt: [number, number, number], index: number) => {
      const [lng, lat] = latLngHgt;
      if (index === 0) {
        poly = poly.concat(lat + ' ' + lng);
      } else {
        poly = poly.concat(' ' + lat + ' ' + lng);
      }
    });
    return poly;
  }

  static getPolyForPostGIS(cartesianArray: Cartesian3[]): string {
    const degreesArray = cartesianArray.map(cartesian => {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), cartographic.height];
    });
    let poly = '';
    degreesArray.forEach((latLngHgt, index) => {
      const [lng, lat] = latLngHgt;
      if (index === 0) {
        poly = poly.concat(lng + ' ' + lat);
      } else {
        poly = poly.concat(',' + lng + ' ' + lat);
      }
    });
    const [lng0, lat0] = degreesArray[0];
    poly = poly.concat(',' + lng0 + ' ' + lat0);
    return poly;
  }

  static cartesian3ToLocation(cartesian: Cartesian3): Location {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      lat: Cesium.Math.toDegrees(cartographic.latitude),
      lon: Cesium.Math.toDegrees(cartographic.longitude),
      alt: cartographic.height
    };
  }

  static locationToCartesian3(location: Location): Cartesian3 {
    return Cesium.Cartesian3.fromDegrees(location.lon, location.lat, location.alt);
  }

  static locationToCartographic(location: Location): Cartesian3 {
    return Cesium.Cartographic.fromDegrees(location.lon, location.lat, location.alt);
  }

  static locationArrayToCartographicArray(locations: Location[]): Cartographic[] {
    return locations.map(location => Cesium.Cartographic.fromDegrees(location.lon, location.lat, location.alt));
  }

  static computeOffset(location: Location, distance: number, direction: number): Location {
    const R = 6378.1; // radius of earth
    const directionRad = Cesium.Math.toRadians(direction);
    const distanceKm = distance / 1000;

    const curLat = Cesium.Math.toRadians(location.lat); // Current lat point converted to radians
    const curLon = Cesium.Math.toRadians(location.lon); // Current long point converted to radians

    const newLat = Math.asin((Math.sin(curLat) * Math.cos(distanceKm / R) +
      Math.cos(curLat) * Math.sin(distanceKm / R) * Math.cos(directionRad)));

    const newLon = curLon + Math.atan2(Math.sin(directionRad) * Math.sin(distanceKm / R) * Math.cos(curLat),
      Math.cos(distanceKm / R) - Math.sin(curLat) * Math.sin(newLat));

    return {
      lat: Cesium.Math.toDegrees(newLat),
      lon: Cesium.Math.toDegrees(newLon)
    };
  }

  static lngLatArrayToCartesian(locations: number[][] | any[][]): Cartesian3[] {
    const cartesianArray = [];
    locations?.forEach(lngLat => {
      const height = lngLat.length === 3 ? lngLat[2] : 0.0;
      cartesianArray.push(Cesium.Cartesian3.fromDegrees(lngLat[0], lngLat[1], height));
    });
    return cartesianArray;
  }

  static lngLatArrayToCartographicArray(locations: number[][]): Cartographic[] {
    const cartographicArray = locations?.map(lngLat => {
        const height = lngLat.length === 3 ? lngLat[2] : 0.0;
        return Cesium.Cartographic.fromDegrees(lngLat[0], lngLat[1], height);
      }
    );
    return cartographicArray || [];
  }

  static lngLatToCartesian3(lngLat: number[]): Cartesian3 {
    return Cesium.Cartesian3.fromDegreesArray(lngLat)[0];
  }

  static lngLatToCartographic(lngLat: number[]): Cartographic {
    return Cesium.Cartographic.fromDegrees(lngLat[0], lngLat[1]);
  }

  static cartographicArrayToDegreesArray(cartographicArray: Cartographic[]): any {
    return cartographicArray.map(cartographic =>
      [Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude), cartographic.height]
    );
  }

  static getBuildingCartesian(building: OSMBuilding): Cartesian3 {
    return new Cesium.Cartesian3.fromDegrees(building.center.lon, building.center.lat);
  }

  static cartesianToMovement(scene: Scene, position: Cartesian3): any {
    const windowPos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position);
    if (windowPos == null) {
      return null;
    } else {
      return {
        startPosition: {
          x: windowPos.x,
          y: windowPos.y
        },
        endPosition: {
          x: windowPos.x,
          y: windowPos.y
        },
        position: {
          x: windowPos.x,
          y: windowPos.y
        }
      };
    }
  }

  static async updateHeights(cartesianArray: Cartesian3[], terrainProvider: TerrainProvider): Promise<Cartesian3[]> {
    let positions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(cartesianArray);
    positions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    return Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
  }

  static downloadJSON(json: any, filename: string): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
}
