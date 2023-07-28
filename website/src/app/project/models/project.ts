import {CesiumAsset} from '../../common/models/cesium-asset';

export interface IBuilding {
  id: string;
  osm_id: number;
  survey_id: string;
  project_id: number;
  location: number[];
  flight_altitude?: number;
  name?: string;
  address?: string;
  locked?: boolean;
  link?: number[];
}

export interface ISurveyArea {
  id: string;
  polygon: number[][];
  project_id: number;
  buildings: IBuilding[];
}

export interface INodeProps {
  segment_index: number;
  waypoint_index: number;
  marker_type: string;
  flight_altitude?: number;
}

export interface INetwork {
  id: string;
  segments: number[][][];
  node_props: INodeProps[];
  project_id?: number;
}

export interface IProjectSettings {
  flight_altitude_m: number;
  max_connector_distance: number;
  building_radius: number;
  show_flight_altitude: boolean;
  layers: CesiumAsset[];
}

export interface Project {
  id: number;
  uuid: string;
  name: string;
  gcs_url: string;
  gcs_login_url: string;
  settings: IProjectSettings;
  createdAt: string;
  updatedAt: string;
  survey_areas?: ISurveyArea[];
  network?: INetwork;
}
