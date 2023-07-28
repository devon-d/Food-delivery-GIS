export class ApiResponse<T> {
  success: boolean;
  redirect?: string;
  message?: string;
  data?: T;
}
