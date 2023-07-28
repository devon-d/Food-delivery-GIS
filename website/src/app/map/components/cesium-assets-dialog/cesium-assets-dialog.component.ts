import {Component, Inject, NgZone, OnInit, ViewChild} from '@angular/core';
import {MatSelectionList, MatSelectionListChange} from '@angular/material/list';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {CesiumAsset, LayerType} from '../../../common/models/cesium-asset';
import {ProjectService} from '../../../project/project.service';

type AssetDialogData = {
  projectId: number,
  selectedAssets: CesiumAsset[]
};

@Component({
  selector: 'app-cesium-assets-dialog',
  templateUrl: './cesium-assets-dialog.component.html',
  styleUrls: ['./cesium-assets-dialog.component.css']
})
export class CesiumAssetsDialogComponent implements OnInit {
  showProgress = false;
  data: AssetDialogData;
  assets: CesiumAsset[] = [];
  @ViewChild('assetList') assetListComponent: MatSelectionList;

  constructor(public dialogRef: MatDialogRef<CesiumAssetsDialogComponent>,
              private projectService: ProjectService,
              @Inject(MAT_DIALOG_DATA) public dialogData: AssetDialogData,
              private ngZone: NgZone) {
    this.data = dialogData;
  }

  static show(dialog: MatDialog, data: AssetDialogData, width: string = '500px'): Observable<CesiumAsset[]> {
    const dialogRef = dialog.open(CesiumAssetsDialogComponent, {width, data, minHeight: '80vh', height: 'auto'});
    return dialogRef.afterClosed();
  }

  ngOnInit(): void {
    this.showProgress = true;
    this.projectService.getCesiumAssets(this.data.projectId).subscribe((response) => {
      const apiAssets = response.data;
      apiAssets.forEach(asset => {
        const match = this.data.selectedAssets.find(selectedAsset => selectedAsset.id === asset.id);
        if (match) {
          asset.selected = match.selected;
          asset.enabled = match.enabled;
        }
      });
      this.assets = apiAssets;
      this.showProgress = false;
    }, (error) => {
      console.log(error);
      this.showProgress = false;
    });
  }

  getIconForAsset(asset: CesiumAsset): string {
    switch (asset.type) {
      case LayerType.IMAGERY:
        if (asset.global) {
          return 'public';
        } else {
          return 'travel_explore';
        }
      case LayerType.TILES:
        return 'view_in_ar';
      case LayerType.GEOJSON:
        return 'format_shapes';
    }
  }

  selectAsset(event: MatSelectionListChange): void {
    const match = this.assets.find(asset => asset.id === event.option.value.id);
    match.selected = event.option.selected;
  }

  onNegative(): void {
    this.ngZone.run(() => {
      this.dialogRef.close();
    });
  }

  onPositive(): void {
    const selectedLayers = this.assetListComponent.selectedOptions.selected.map(item => item.value);
    this.ngZone.run(() => {
      this.dialogRef.close(selectedLayers);
    });
  }
}
