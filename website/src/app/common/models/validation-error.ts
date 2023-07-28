import {NetworkNode} from '../../map/components/network-layer/models/gcs-network';

export interface ErrorDescriptionArg {
  value: number;
  units: string;
  precision: number;
}

export interface ValidationError {
  description: string;
  description_args?: ErrorDescriptionArg[];
  edge_ids: number[];
  node_ids: number[];
  nodes?: NetworkNode[];
  edges?: NetworkNode[][];
}

export interface ValidationErrors {
  validation_errors: ValidationError[];
}
