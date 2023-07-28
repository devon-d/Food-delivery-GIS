export interface RGInputParams {
  lat: number;
  lon: number;
}

export class ReverseGeocodeInput {
  id: string;
  params: RGInputParams;
}
