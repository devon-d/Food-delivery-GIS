import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {AppModule} from './app/app.module';
import {environment} from './environments/environment';

if (environment.production) {
  enableProdMode();
}

Cesium.buildModuleUrl.setBaseUrl('/assets/cesium/');
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZGI3NmQ4MC1mZTk5LTQ5NTEtOGI5OS0zOTlhZGQ2NzdkNjAiLCJpZCI6NDMwNjcsImlhdCI6MTYzNjM3ODg2M30.7hrLU0NST8QZZqjdLYvXqxL0LQzPSEqdhSuWCEMXH98';
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
