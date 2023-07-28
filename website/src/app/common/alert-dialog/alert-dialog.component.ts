import {Component, Inject, NgZone} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Observable} from 'rxjs';

export interface DialogData {
  title: string;
  msg: string;
  positiveText: string;
  negativeText?: string;
  showInput?: boolean;
  inputHint?: string;
}

@Component({
  selector: 'app-alert-dialog',
  templateUrl: 'alert-dialog.component.html',
  styleUrls: ['alert-dialog.component.css']
})
export class AlertDialogComponent {
  inputText?: string;

  constructor(
    public dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private ngZone: NgZone) {
  }

  static show(dialog: MatDialog, data: DialogData, width: string = '400px'): Observable<string | boolean> {
    const dialogRef = dialog.open(AlertDialogComponent, {width, data});
    return dialogRef.afterClosed();
  }

  onNegative(): void {
    this.ngZone.run(() => {
      this.dialogRef.close(false);
    });
  }

  onPositive(): void {
    const dialogResult = this.data.showInput ? this.inputText : true;
    this.ngZone.run(() => {
      this.dialogRef.close(dialogResult);
    });
  }
}
