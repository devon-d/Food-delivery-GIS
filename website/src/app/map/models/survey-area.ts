import {Cartesian3} from 'angular-cesium';
import {OSMBuilding} from './osm-building';
import {Util} from '../util';
import {v4 as uuidv4} from 'uuid';

export class SurveyArea {
  readonly id: string;
  private buildings?: OSMBuilding[] = [];
  private polygonPositions: Cartesian3[] = [];
  private visible = true;

  constructor(polygonPositions: Cartesian3[], uuid?: string, buildings?: OSMBuilding[]) {
    if (uuid) {
      this.id = uuid;
    } else {
      this.id = uuidv4();
    }
    this.polygonPositions = polygonPositions;
    this.buildings = buildings;
  }

  getPolygonPositions(): Cartesian3[] {
    return this.polygonPositions;
  }

  setPolygonPositions(positions: Cartesian3[]): void {
    this.polygonPositions = positions;
  }

  getPositionsInDegrees(): number[][] {
    return this.polygonPositions.map(cartesian => {
      const location = Util.cartesian3ToLocation(cartesian);
      return [location.lon, location.lat];
    });
  }

  setBuildings(buildings: OSMBuilding[]): void {
    this.buildings = buildings;
  }

  getBuildings(): OSMBuilding[] {
    return this.buildings;
  }

  addBuilding(building: OSMBuilding): void {
    this.buildings.push(building);
  }

  deleteBuilding(buildingId: string): OSMBuilding {
    let building = null;
    const index = this.buildings.findIndex(b => b.uuid === buildingId);
    if (index !== -1) {
      building = this.buildings.splice(index, 1)[0];
    }
    return building;
  }

  getBuilding(buildingId: string): OSMBuilding {
    return this.buildings.find(building => {
      return building.uuid === buildingId;
    });
  }

  getBuildingAt(index: number): OSMBuilding {
    if (index >= this.buildings.length || index < 0) {
      return null;
    }
    return this.buildings[index];
  }

  getNextBuilding(building: OSMBuilding, skipLocked: boolean = false): OSMBuilding {
    const currentIndex = this.getBuildingIndex(building);
    const nextIndex = currentIndex + 1;
    if (this.buildings[nextIndex]) {
      if (skipLocked && this.buildings[nextIndex].locked) {
        return this.getNextBuilding(this.buildings[nextIndex], true);
      } else {
        return this.buildings[nextIndex];
      }
    } else if (nextIndex >= this.buildings.length) {
      return skipLocked ? building : this.buildings[0];
    }
  }

  getPreviousBuilding(building: OSMBuilding): OSMBuilding {
    const currentIndex = this.getBuildingIndex(building);
    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = this.buildings.length - 1;
    }
    return this.buildings[previousIndex];
  }


  getBuildingIndex(building: OSMBuilding): number {
    return this.buildings.indexOf(building);
  }

  updateBuildingPosition(uuid: string, position: Cartesian3, flightAltitude?: number): OSMBuilding {
    const building = this.getBuilding(uuid);
    if (building == null) {
      return null;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(position);
    building.center.lat = Cesium.Math.toDegrees(cartographic.latitude);
    building.center.lon = Cesium.Math.toDegrees(cartographic.longitude);
    building.center.alt = cartographic.height;
    building.flightAltitude = flightAltitude;
    return building;
  }

  updateBuildingAddress(uuid: string, address: string): OSMBuilding {
    const building = this.getBuilding(uuid);
    if (building == null) {
      return null;
    }

    building.address = address;
    return building;
  }

  updateBuildingLink(uuid: string, positions: Cartesian3[], linkAltitude: number): OSMBuilding {
    const building = this.getBuilding(uuid);
    if (building == null) {
      return null;
    }

    building.linkPositions = positions;
    building.linkAltitude = linkAltitude;
    return building;
  }

  lockBuildingPosition(uuid: string): OSMBuilding {
    const building = this.getBuilding(uuid);
    if (building == null) {
      return null;
    }

    building.locked = true;
    return building;
  }

  unlockBuildingPosition(uuid: string): OSMBuilding {
    const building = this.getBuilding(uuid);
    if (building == null) {
      return null;
    }

    building.locked = false;
    return building;
  }

  lockAllBuildings(): void {
    this.buildings?.forEach(building => {
      building.locked = true;
    });
  }

  unlockAllBuildings(): void {
    this.buildings?.forEach(building => {
      building.linkPositions = null;
      building.locked = false;
    });
  }

  set show(visible: boolean) {
    this.visible = visible;
  }

  get show(): boolean {
    return this.visible;
  }
}


