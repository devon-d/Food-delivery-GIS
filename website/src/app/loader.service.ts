import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private readonly loaderSubject = new Subject<boolean>();
  loaderState = this.loaderSubject.asObservable();

  constructor() {
  }

  show(): void {
    this.loaderSubject.next(true);
  }

  hide(): void {
    this.loaderSubject.next(false);
  }
}
