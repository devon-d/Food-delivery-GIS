import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {Project, IProjectSettings} from './models/project';
import {ApiResponse} from '../common/util/api-response';
import {CesiumAsset} from '../common/models/cesium-asset';
import {InterceptorHttpParams} from '../common/util/interceptor-http-params';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly baseUrl = `${API_URL}/project`;

  constructor(private httpClient: HttpClient) {
  }

  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.httpClient.get<ApiResponse<Project[]>>(this.baseUrl, {withCredentials: true});
  }

  createProject(name: string): Observable<ApiResponse<Project>> {
    const data = {name};
    return this.httpClient.post<ApiResponse<Project>>(this.baseUrl, data, {withCredentials: true});
  }

  deleteProject(projectId: number): Observable<ApiResponse<Project>> {
    return this.httpClient.delete<ApiResponse<Project>>(`${this.baseUrl}/${projectId}`, {withCredentials: true});
  }

  getProject(projectId: string): Observable<ApiResponse<Project>> {
    return this.httpClient.get<ApiResponse<Project>>(`${this.baseUrl}/${projectId}`, {withCredentials: true});
  }

  updateGCSUrl(projectId: number, gcsUrl: string, gcsLoginUrl: string): Observable<ApiResponse<any>> {
    const data = {gcsUrl, gcsLoginUrl};
    return this.httpClient.put<ApiResponse<any>>(`${this.baseUrl}/${projectId}`, data, {withCredentials: true});
  }

  updateSettings(projectId: number, settings: IProjectSettings): Observable<ApiResponse<any>> {
    return this.httpClient.put<ApiResponse<any>>(`${this.baseUrl}/${projectId}/settings`, settings, {withCredentials: true});
  }

  getCesiumAssets(projectId: number): Observable<ApiResponse<CesiumAsset[]>> {
    const params = new InterceptorHttpParams({showProgress: false});
    return this.httpClient.get<ApiResponse<CesiumAsset[]>>(`${this.baseUrl}/${projectId}/assets`, {withCredentials: true, params});
  }
}
