import {BaseEdit, EditMode, EditType} from './base-edit';

export interface PolygonEditProps {
  id: string;
  polygon?: number[][];
}

export class PolygonEdit extends BaseEdit<PolygonEditProps> {

  constructor(editMode: EditMode, props: PolygonEditProps) {
    super({
      editType: EditType.POLYGON,
      editMode,
      props
    });
  }

  parse(): string {
    return JSON.stringify(this);
  }
}
