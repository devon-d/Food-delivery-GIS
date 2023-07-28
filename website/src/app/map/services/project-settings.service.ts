import {Injectable} from '@angular/core';
import {IProjectSettings} from '../../project/models/project';
import {Subject} from 'rxjs';
import {environment} from '../../../environments/environment';
import {CesiumAsset} from '../../common/models/cesium-asset';

@Injectable()
export class ProjectSettingsService {
  private currentSettings: IProjectSettings = {
    show_flight_altitude: false,
    flight_altitude_m: 70,
    building_radius: 2.0,
    max_connector_distance: environment.networkBufferRadius * 1000,
    layers: [],
  };
  private settingsSubject = new Subject<IProjectSettings>();
  readonly settingsUpdate$ = this.settingsSubject.asObservable();

  set settings(value: IProjectSettings) {
    this.currentSettings = {
      ...this.currentSettings,
      ...value
    };
    this.settingsSubject.next(value);
  }

  get settings(): IProjectSettings {
    return this.currentSettings;
  }

  set layers(layers: CesiumAsset[]) {
    this.currentSettings = {
      ...this.currentSettings,
      layers
    };
  }

  get layers(): CesiumAsset[] {
    return this.settings.layers;
  }
}
