import {BaseEdit, EditMode, EditType} from './base-edit';

export interface BuildingEditProps {
  id: string;
  osm_id: number;
  survey_id: string;
  location: number[];
  flight_altitude?: number;
  name?: string;
  address?: string;
  locked?: boolean;
  link?: number[][];
}

export class BuildingEdit extends BaseEdit<BuildingEditProps> {
  constructor(editMode: EditMode, props: BuildingEditProps) {
    super({
      editType: EditType.BUILDING,
      editMode,
      props
    });
  }

  parse(): string {
    return JSON.stringify(this);
  }
}
