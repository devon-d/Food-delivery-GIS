import {Injectable} from '@angular/core';
import {HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {LoaderService} from './loader.service';
import {InterceptorHttpParams} from './common/util/interceptor-http-params';

@Injectable({
  providedIn: 'root'
})
export class LoaderInterceptorService implements HttpInterceptor {
  constructor(private loaderService: LoaderService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.params instanceof InterceptorHttpParams) {
      if (req.params.interceptorConfig.showProgress) {
        this.showLoader();
      }
    } else {
      this.showLoader();
    }

    return next.handle(req).pipe(tap((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        this.onEnd();
      }
    }, () => {
      this.onEnd();
    }));
  }

  private onEnd(): void {
    this.hideLoader();
  }

  showLoader(): void {
    this.loaderService.show();
  }

  hideLoader(): void {
    this.loaderService.hide();
  }
}
