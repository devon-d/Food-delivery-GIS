import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuard} from './auth/auth.guard';
import {NotFoundComponent} from './common/not-found/not-found.component';

const routes: Routes = [
  {
    path: 'project/:id',
    loadChildren: () => import('./map/map.module').then((m) => m.MapModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'projects',
    loadChildren: () => import('./project/project.module').then((m) => m.ProjectModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full'
  },
  {path: '404', component: NotFoundComponent},
  {path: '**', redirectTo: '/404'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
