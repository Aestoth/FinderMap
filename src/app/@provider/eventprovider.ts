import { iProvider } from '@app/@interfaces/provider';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export class Provider {
  private _event: Subject<iProvider>;
  public mapReady: boolean = false;

  constructor() {
    this._event = new Subject<iProvider>();
  }

  eventEmit(key: string, data?: any) {
    this._event.next({key, data});
  }

  on(key: string): Observable<iProvider> {
    return this._event.asObservable().pipe(
      filter((event) => event.key === key),
      map((event) => event.data)
    );
  }
}
