import {Injectable, NgZone} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {Router} from '@angular/router';
import {InterceptorHttpParams} from './interceptor-http-params';
import {MatSnackBar} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService,
              private router: Router,
              private ngZone: NgZone,
              private snackBar: MatSnackBar) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(tap(() => {
    }, (error) => {
      const noRedirect = request.params instanceof InterceptorHttpParams && request.params.interceptorConfig.noRedirect;
      if (error.status === 401 && !noRedirect) {
        this.authService.logout();
        this.ngZone.run(() => {
          this.router.navigate(['/login'], {});
        });
      } else {
        let msg = error.message;
        if (error.error.message) {
          msg = error.error.message;
        }
        this.ngZone.run(() => {
          this.snackBar.open(msg, 'DISMISS', {
            horizontalPosition: 'end',
            verticalPosition: 'top',
            duration: 3000,
            panelClass: ['snackbar-error-message']
          });
        });
      }
    }));
  }

}

