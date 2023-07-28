import {Component, EventEmitter, HostBinding, Input, OnInit, Output, ViewChild} from '@angular/core';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {Observable} from 'rxjs';
import {ValidationError} from '../../../common/models/validation-error';
import {ExportError} from '../../../common/models/export-error';

@Component({
  selector: 'app-network-error-viewer',
  templateUrl: './network-error-viewer.component.html',
  styleUrls: ['./network-error-viewer.component.css']
})
export class NetworkErrorViewerComponent implements OnInit {
  @Input() validationErrors: Observable<ValidationError[]>;
  @Input() exportError: Observable<ExportError>;
  @Output() highlightErrorEvent = new EventEmitter<ValidationError>();
  @Output() dismissEvent = new EventEmitter<any>();
  @ViewChild('errorPaginator') errorPaginator: MatPaginator;
  @HostBinding('hidden') isHidden = true;
  private successMessage = '';
  private successTitle = '';
  errors: ValidationError[] = [];
  currentError: ValidationError = null;
  parsedDescription: string = null;
  success = () => this.errors.length === 0;

  constructor() {
  }

  ngOnInit(): void {
    this.validationErrors.subscribe(errs => {
      this.successTitle = 'No Errors Found!';
      this.successMessage = 'All errors have been fixed. Flight network is ready to be exported.';
      this.initPages(errs);
      this.isHidden = false;
    });
    this.exportError.subscribe(err => {
      if (err == null) {
        this.successTitle = 'Network Successfully Exported!';
        this.successMessage = 'Flight network has been successfully exported to GCS server.';
        this.initPages([]);
      } else {
        this.successTitle = 'No Errors Found!';
        this.successMessage = 'All errors have been fixed. Flight network is ready to be exported.';
        const validationError: ValidationError = {
          description: err.message,
          description_args: err.extra?.message_args,
          node_ids: [],
          edge_ids: [],
        };
        this.initPages([validationError]);
      }
      this.isHidden = false;
    });
  }

  private initPages(errors: ValidationError[]): void {
    if (errors == null || errors.length === 0) {
      this.reset();
      return;
    }
    this.errors = errors;
    this.setCurrentError(0);
  }

  changePage(event: PageEvent): void {
    this.setCurrentError(event.pageIndex);
  }

  dismiss(): void {
    this.reset();
    this.isHidden = true;
    this.dismissEvent.emit();
  }

  markErrorAsFixed(): void {
    const prevIndex = this.errorPaginator.pageIndex;
    this.errors.splice(this.errorPaginator.pageIndex, 1);
    if (this.errors.length === 0) {
      this.reset();
    } else {
      let pIndex = prevIndex;
      if (pIndex >= this.errors.length) {
        pIndex = this.errors.length - 1;
      }
      this.setCurrentError(pIndex);
    }
  }

  getTitle(): string {
    if (this.success()) {
      return this.successTitle;
    } else {
      return 'Fix Errors';
    }
  }

  private reset(): void {
    this.errors = [];
    this.setCurrentError(null);
  }

  private setCurrentError(index: number): void {
    this.errorPaginator.pageIndex = index;
    this.currentError = this.errors[index];
    if (this.currentError) {
      this.parsedDescription = this.parseDescription(this.currentError);
    } else {
      this.parsedDescription = '';
    }
    this.highlightErrorEvent.emit(this.currentError);
  }

  private parseDescription(error: ValidationError): string {
    let desc = error.description;
    error.description_args?.forEach((arg, i) => {
      desc = desc.replace(`{${i}}`, `${arg.value.toFixed(2)} ${arg.units}`);
    });
    return desc;
  }
}
