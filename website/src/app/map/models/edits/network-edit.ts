import {BaseEdit, EditMode, EditType} from './base-edit';
import {INetwork, INodeProps} from '../../../project/models/project';

export interface NetworkEditProps extends INetwork {
  id: string;
  segments: number[][][];
  node_props: INodeProps[];
}

export class NetworkEdit extends BaseEdit<NetworkEditProps> {

  constructor(editMode: EditMode, props: NetworkEditProps) {
    super({
      editType: EditType.NETWORK,
      editMode,
      props
    });
  }

  parse(): string {
    return JSON.stringify(this);
  }
}
