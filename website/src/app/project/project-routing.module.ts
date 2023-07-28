import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ProjectComponent} from './project.component';

const authRoutes: Routes = [
  {path: '', component: ProjectComponent}
];

@NgModule({
  imports: [
    RouterModule.forChild(authRoutes)
  ],
  exports: [
    RouterModule
  ]
})
export class ProjectRoutingModule {
}
