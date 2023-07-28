import {v4 as uuidv4} from 'uuid';

let editCount = 0;

export enum EditMode {
  CREATE = ('CREATE'),
  UPDATE = ('UPDATE'),
  DELETE = ('DELETE'),
}

export enum EditType {
  POLYGON = ('POLYGON'),
  BUILDING = ('BUILDING'),
  NETWORK = ('NETWORK'),
  LINK = ('LINK')
}

export interface IBaseEdit<T> {
  index?: number;
  editId?: string;
  editMode: EditMode;
  editType: EditType;
  isBulk?: boolean;
  props: T;
}

export abstract class BaseEdit<T> {
  editId: string;
  editMode: EditMode;
  editType: EditType;
  props: T;
  index: number;
  isBulk: boolean;

  protected constructor(attributes: IBaseEdit<T>) {
    this.editId = uuidv4();
    this.index = editCount++;
    for (const key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        this[key] = attributes[key];
      }
    }
  }

  abstract parse(): string;
}


export function createEdit<T extends BaseEdit<any>, P extends IBaseEdit<any>>(Ctor: new (...args: any[]) => T, attributes: P): T {
  return new Ctor(attributes);
}
