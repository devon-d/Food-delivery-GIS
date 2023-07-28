import {Injectable} from '@angular/core';

import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {tap} from 'rxjs/operators';
import {Auth} from './auth';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  redirectUrl: string; // store the URL so we can redirect after logging in
  baseUrl = `${API_URL}/user`;

  constructor(private httpClient: HttpClient) {
  }

  login(username: string, password: string): Observable<Auth> {
    const data = {username, password};
    return this.httpClient.post<Auth>(`${this.baseUrl}/login`, data, {withCredentials: true})
      .pipe(tap((auth) => {
        if (auth.success) {
          // store user details in local storage to keep user logged in between page refreshes
          localStorage.setItem('currentUser', JSON.stringify(auth.data));
        }
      }));
  }

  logout(): Observable<Auth> {
    return this.httpClient.post<Auth>(`${this.baseUrl}/logout`, {}, {withCredentials: true})
      .pipe(tap(() => {
        localStorage.removeItem('currentUser');
      }, () => {
        localStorage.removeItem('currentUser');
      }));
  }

  fetchUser(): Observable<Auth> {
    return this.httpClient.get<Auth>(this.baseUrl, {withCredentials: true}).pipe(tap((auth) => {
      if (!auth.success) {
        localStorage.removeItem('currentUser');
      }
    }));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUser');
  }
}
