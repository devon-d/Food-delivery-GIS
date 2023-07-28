import {defer, Observable} from 'rxjs';

export function last(array: any[]): any {
  return array[array.length - 1];
}

export function doOnSubscribe<T>(onSubscribe: () => void): (source: Observable<T>) =>  Observable<T> {
  return function inner(source: Observable<T>): Observable<T> {
    return defer(() => {
      onSubscribe();
      return source;
    });
  };
}
