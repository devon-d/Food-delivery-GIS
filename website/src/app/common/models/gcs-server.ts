export interface GcsServer {
  frontend_git_hash: string;
  longitude_deg: number;
  git_hash: string;
  latitude_deg: number;
  id: number;
  backend_url: string;
  frontend_url: string;
  name: string;
  is_test_deployment: boolean;
  backend_version: string;
  sdk_version: string;
}
