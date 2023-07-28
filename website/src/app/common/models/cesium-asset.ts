export enum LayerType {
  GEOJSON = 'GEOJSON',
  IMAGERY = 'IMAGERY',
  TILES = '3DTILES',
}

export interface CesiumAsset {
  id: number;
  name: string;
  type: LayerType;
  global: boolean;
  enabled: boolean;
  selected: boolean;
}
