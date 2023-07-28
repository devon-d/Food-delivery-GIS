import {NgModule} from '@angular/core';

import './extensions/editable-polygon.extension';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {NgxFileHelpersModule} from 'ngx-file-helpers';
import {AngularCesiumModule, AngularCesiumWidgetsModule} from 'angular-cesium';

import {MatSidenavModule} from '@angular/material/sidenav';
import {MatTreeModule} from '@angular/material/tree';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {CommonModule} from '@angular/common';
import {MapRoutingModule} from './map-routing.module';
import {SurveyLayerComponent} from './components/survey-layer/survey-layer.component';
import {MapComponent} from './map.component';
import {ShapeMenuComponent} from './components/shape-menu/shape-menu.component';
import {NetworkLayerComponent} from './components/network-layer/network-layer.component';
import {SurveyTableComponent} from './components/survey-table/survey-table.component';
import {CloudSyncComponent} from './components/cloud-sync/cloud-sync.component';
import {MatToolbarModule} from '@angular/material/toolbar';
import {HelpDialogComponent} from './components/help-dialog/help-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import {NetworkErrorViewerComponent} from './components/network-error-viewer/network-error-viewer.component';
import {FlexModule} from '@angular/flex-layout';
import {PolygonLayerComponent} from './components/polygon-layer/polygon-layer.component';
import {AdjustmentDialogComponent} from './components/adjustment-dialog/adjustment-dialog.component';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MeasureToolComponent} from './components/measure-tool/measure-tool.component';
import {SettingsDialogComponent} from './components/settings-dialog/settings-dialog.component';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MessageAlertComponent} from '../common/message-alert/message-alert.component';
import {GeoapifyService} from './services/geoapify.service';
import {CesiumAssetsDialogComponent} from './components/cesium-assets-dialog/cesium-assets-dialog.component';
import {MatListModule} from '@angular/material/list';
import {VirtualScrollerModule} from 'ngx-virtual-scroller';
import {ScrollingModule} from '@angular/cdk/scrolling';

@NgModule({
  declarations: [
    MapComponent,
    ShapeMenuComponent,
    SurveyLayerComponent,
    SurveyTableComponent,
    NetworkLayerComponent,
    CloudSyncComponent,
    HelpDialogComponent,
    NetworkErrorViewerComponent,
    PolygonLayerComponent,
    AdjustmentDialogComponent,
    MeasureToolComponent,
    SettingsDialogComponent,
    MessageAlertComponent,
    CesiumAssetsDialogComponent
  ],
  imports: [
    CommonModule,
    MapRoutingModule,
    AngularCesiumModule.forRoot(),
    AngularCesiumWidgetsModule,
    MatButtonModule, MatCardModule, MatIconModule, MatMenuModule, MatCheckboxModule,
    MatTooltipModule, MatProgressSpinnerModule, NgxFileHelpersModule, MatSidenavModule,
    MatTreeModule, MatTableModule, MatPaginatorModule, MatToolbarModule, MatDialogModule, FlexModule,
    MatFormFieldModule, FormsModule, MatInputModule, MatSlideToggleModule, ReactiveFormsModule, MatListModule,
    ScrollingModule, VirtualScrollerModule
  ],
  providers: [GeoapifyService],
  bootstrap: [MapComponent]
})
export class MapModule {
  constructor() {
    window.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }
}
