import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AuthModule} from './auth/auth.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {LoaderInterceptorService} from './loader-interceptor.service';
import {AlertDialogComponent} from './common/alert-dialog/alert-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {NotFoundComponent} from './common/not-found/not-found.component';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ErrorInterceptor} from './common/util/error-interceptor';

@NgModule({
  declarations: [
    AppComponent,
    AlertDialogComponent,
    NotFoundComponent
  ],
  imports: [
    AuthModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    FormsModule
  ],
  providers: [[
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptorService,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ]],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {
    window.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }
}
