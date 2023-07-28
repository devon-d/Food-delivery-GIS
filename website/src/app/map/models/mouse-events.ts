import {EventEmitter} from '@angular/core';
import {EventResult} from 'angular-cesium/lib/angular-cesium/services/map-events-mananger/map-events-manager';

export interface MouseEvents {
  leftClick: EventEmitter<EventResult>;
  leftDown: EventEmitter<EventResult>;
  leftUp: EventEmitter<EventResult>;
  mouseMove: EventEmitter<EventResult>;
  rightClick: EventEmitter<EventResult>;
  leftCtrlClick: EventEmitter<EventResult>;
  rightCtrlClick: EventEmitter<EventResult>;
  doubleClick: EventEmitter<EventResult>;
}
