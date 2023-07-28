import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MapComponent} from './map.component';
import {PendingChangesGuard} from '../common/util/pending-changes.guard';

const routes: Routes = [
  {path: '', component: MapComponent, canDeactivate: [PendingChangesGuard]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapRoutingModule {
}
