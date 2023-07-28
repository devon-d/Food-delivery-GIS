import {BuildingEditProps} from './building-edit';
import {BaseEdit, EditMode, EditType} from './base-edit';

export class BulkBuildingEdit extends BaseEdit<BuildingEditProps[]> {
  constructor(editMode: EditMode, props: BuildingEditProps[]) {
    super({
      editType: EditType.BUILDING,
      isBulk: true,
      editMode,
      props
    });
  }

  parse(): string {
    return JSON.stringify(this);
  }
}
