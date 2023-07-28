import {ErrorDescriptionArg} from './validation-error';

export interface ErrorExtra {
  message_args: ErrorDescriptionArg[];
}

export interface ExportError {
  message: string;
  extra?: ErrorExtra;
}
