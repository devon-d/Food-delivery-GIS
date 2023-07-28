import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {ProjectRoutingModule} from './project-routing.module';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {MatRippleModule} from '@angular/material/core';
import {MatListModule} from '@angular/material/list';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import {ServerListDialogComponent} from './server-list-dialog/server-list-dialog.component';
import {ProjectComponent} from './project.component';
import {MatDialogModule} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@NgModule({
    imports: [
        CommonModule,
        ProjectRoutingModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatRippleModule,
        MatListModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatDialogModule,
        MatTooltipModule,
        MatProgressSpinnerModule
    ],
  declarations: [
    ProjectComponent,
    ServerListDialogComponent
  ]
})
export class ProjectModule {
}
