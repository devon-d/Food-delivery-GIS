import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Location} from '../../models/location';
import {Util} from '../../util';
import {Observable} from 'rxjs';
import {CesiumService} from 'angular-cesium';

export interface PointOffset {
  distance: number;
  direction: number;
  altitude?: number;
  location?: Location;
}

type DialogData = { location: Location, altitude: number, globalAltitude: number };

@Component({
  selector: 'app-adjustment-dialog',
  templateUrl: './adjustment-dialog.component.html',
  styleUrls: ['./adjustment-dialog.component.css']
})
export class AdjustmentDialogComponent implements OnInit {
  cesiumService: CesiumService;
  pointOffset: PointOffset = {
    distance: null,
    direction: 0,
    altitude: null,
  };
  globalAltitude: number;

  constructor(
    public dialogRef: MatDialogRef<AdjustmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.pointOffset.altitude = data.altitude;
    this.globalAltitude = data.globalAltitude;
  }

  static show(
    dialog: MatDialog,
    cesiumService: CesiumService,
    data: DialogData,
    width: string = '500px'
  ): Observable<PointOffset> {
    const dialogRef = dialog.open(AdjustmentDialogComponent, {width, data});
    dialogRef.componentInstance.cesiumService = cesiumService;
    return dialogRef.afterClosed();
  }

  ngOnInit(): void {
  }

  onPositive(): void {
    const dist = this.pointOffset.distance || 0;
    const dir = this.pointOffset.direction || 0;
    let newLoc = Util.computeOffset(this.data.location, dist, dir);
    const cartographicArray = [Cesium.Cartographic.fromDegrees(newLoc.lon, newLoc.lat)];
    Cesium.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, cartographicArray).then(updatePositions => {
      newLoc = {
        lat: Cesium.Math.toDegrees(updatePositions[0].latitude),
        lon: Cesium.Math.toDegrees(updatePositions[0].longitude),
        alt: Cesium.Math.toDegrees(updatePositions[0].height)
      };
      this.pointOffset.location = newLoc;
      this.pointOffset.distance = Number(this.pointOffset.distance);
      this.pointOffset.direction = Number(this.pointOffset.direction);
      if (this.pointOffset.altitude) {
        this.pointOffset.altitude = Number(this.pointOffset.altitude);
      }
      this.dialogRef.close(this.pointOffset);
    });
  }

  onNegative(): void {
    this.dialogRef.close();
  }

  setDirection(direction: number): void {
    this.pointOffset.direction = direction;
  }
}
