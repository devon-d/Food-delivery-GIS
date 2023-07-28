export interface OsmResponse<T> {
  version: number;
  generator: string;
  elements: T[];
}
