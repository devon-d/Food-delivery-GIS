export interface NetworkNode {
  id: number;
  name: string;
  node_type: string;
  longitude_deg: string;
  latitude_deg: string;
  flight_altitude_m: number;
  uuid: string;
  ground_elevation_m: number;
  network_id: number;
  address?: string;
  is_test_point?: boolean;
}

export interface NetworkEdge {
  id: number;
  from_vertex_id: number;
  to_vertex_id: number;
  network_id: number;
}

export interface GcsNetwork {
  id: number;
  name: string;
  safe_up_land_timeout_sec: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
