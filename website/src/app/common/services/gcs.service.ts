import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {ApiResponse} from '../util/api-response';
import {GcsServer} from '../models/gcs-server';
import {ValidationErrors} from '../models/validation-error';
import {InterceptorHttpParams} from '../util/interceptor-http-params';
import {switchMap} from 'rxjs/operators';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class GcsService {
  private readonly baseUrl = `${API_URL}/gcs`;

  constructor(private httpClient: HttpClient) {
  }

  getGCSServers(): Observable<ApiResponse<GcsServer[]>> {
    return this.httpClient.get<ApiResponse<GcsServer[]>>(`${this.baseUrl}/servers`, {
      withCredentials: true,
      params: new InterceptorHttpParams({noRedirect: true})
    });
  }

  validateFlightNetwork(serverUrl: string, json: string): Observable<ValidationErrors> {
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const params = new InterceptorHttpParams({showProgress: true, noRedirect: true});
    return this.httpClient.post<ValidationErrors>(`${serverUrl}/api/v1/flightnetworks/validate/`, json, {
      withCredentials: true,
      params, headers
    });
  }

  updateFlightNetwork(serverUrl: string, network: any): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
    const params = new InterceptorHttpParams({showProgress: true, noRedirect: true});
    return new Observable(observer => {
      this.httpClient.post<any>(`${serverUrl}/api/v1/flightnetworks/get_current/`, {}, {
        withCredentials: true, params
      }).pipe(switchMap(response => {
        return this.httpClient.patch<any>(`${serverUrl}/api/v1/flightnetworks/${response.id}/`, network, {
          withCredentials: true,
          params, headers
        });
      })).subscribe(response => {
        observer.next(response);
        observer.complete();
      }, error => {
        observer.error(error);
      });
    });
  }
}
