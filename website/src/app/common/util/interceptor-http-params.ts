import {HttpParams, HttpParamsOptions} from '@angular/common/http';

export class InterceptorHttpParams extends HttpParams {
  constructor(
    public interceptorConfig: { showProgress?: boolean, noRedirect?: boolean },
    params?: { [param: string]: string | string[] }
  ) {
    super({fromObject: params} as HttpParamsOptions);
  }
}
