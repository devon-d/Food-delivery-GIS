import {from, Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ReverseGeocodeResult} from '../models/reverse-geocode-result';
import {ReverseGeocodeInput} from '../models/reverse-geocode-input';
import {LoaderInterceptorService} from '../../loader-interceptor.service';
import {environment} from '../../../environments/environment';

const BATCH_API_URL = environment.geoapifyUrl;

@Injectable()
export class GeoapifyService {
  constructor(private httpClient: HttpClient,
              private loaderService: LoaderInterceptorService) {
  }

  fetchMissingAddresses(inputs: ReverseGeocodeInput[]): Observable<ReverseGeocodeResult[]> {
    const data = {
      api: '/v1/geocode/reverse',
      params: {limit: '1'},
      inputs
    };

    const promise = new Promise<ReverseGeocodeResult[]>((resolve, reject) => {
      this.httpClient.post(BATCH_API_URL, data).subscribe((res: any) => {
        this.getAsyncResult(`${BATCH_API_URL}&id=${res.id}`, 5000, 15, resolve, reject);
      });
    });
    return from(promise);
  }

  private getAsyncResult(url, timeout, maxAttempt, resolve, reject): void {
    const that = this;
    repeatUntilSuccess(this.httpClient, 0);

    function repeatUntilSuccess(httpClient, attemptCount): void {
      httpClient.get(url, {observe: 'response'}).subscribe((response: any) => {
        if (response.status === 200) {
          // result is ready
          const results = response.body.results;

          // map results to GeocodeResponse objects
          const geocodeResults = results.map(item => {
            let address = '';
            if (item.result.features.length > 0) {
              address = item.result.features[0].properties.formatted;
            }
            const geocodeResponse: ReverseGeocodeResult = {
              id: item.id,
              lat: item.params.lat,
              lon: item.params.lon,
              address
            };
            return geocodeResponse;
          });

          // send results
          that.loaderService.hideLoader();
          resolve(geocodeResults);
        } else if (attemptCount >= maxAttempt) {
          that.loaderService.hideLoader();
          reject('Max amount of attempt achived');
        } else if (response.status === 202) {
          that.loaderService.showLoader();
          // Repeat after timeout
          setTimeout(() => {
            repeatUntilSuccess(httpClient, attemptCount + 1);
          }, timeout);
        } else {
          that.loaderService.hideLoader();
          // something went wrong
          reject(response.body);
        }
      }, err => {
        that.loaderService.hideLoader();
        reject(err.error);
      });
    }
  }
}
