import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {PolylineEditorObservable, RangeAndBearingComponent} from 'angular-cesium';

export enum MeasureType {
  LINE
}

@Component({
  selector: 'app-measure-tool',
  templateUrl: './measure-tool.component.html',
  styleUrls: ['./measure-tool.component.css']
})
export class MeasureToolComponent implements OnInit {
  @ViewChild('rangeAndBearing') private rangeAndBearing: RangeAndBearingComponent;
  private rnb: PolylineEditorObservable;

  @Input() set measuring(type: MeasureType) {
    if (type != null) {
      this.startDrawing(type);
    } else {
      this.stopDrawing();
    }
  }

  constructor() {
  }

  ngOnInit(): void {
  }

  convertToMeters(distance: number): string {
    return parseFloat((distance * 1000).toFixed(0)) + ' m';
  }

  private startDrawing(type: MeasureType): void {
    if (type === MeasureType.LINE) {
      if (this.rnb) {
        this.rnb.dispose();
      }

      this.rnb = this.rangeAndBearing.create({
        lineEditOptions: {
          clampHeightTo3D: true,
          clampHeightTo3DOptions: {
            clampToTerrain: true, // Default: false (if true will only clamp to terrain)
            clampMostDetailed: true, // Fix height after finish editing
            clampToHeightPickWidth: 1 // scene.clampToHeight() width , 3dTiles only
          }
        }
      });
    }
  }

  private stopDrawing(): void {
    this.rnb?.dispose();
  }
}
