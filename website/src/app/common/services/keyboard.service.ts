import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  private keyupSubject: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();

  get keydown(): Observable<KeyboardEvent> {
    return this.keyupSubject.asObservable();
  }

  constructor() {
    window.addEventListener('keyup', event => {
      this.keyupSubject.next(event);
    });
  }
}
