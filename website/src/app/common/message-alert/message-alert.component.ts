import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Observable, Subscription} from 'rxjs';

@Component({
  selector: 'app-message-alert',
  templateUrl: './message-alert.component.html',
  styleUrls: ['./message-alert.component.css']
})
export class MessageAlertComponent implements OnInit, OnDestroy {
  @Input() success$: Observable<string>;
  @Input() error$: Observable<string>;
  private subscriptions = new Subscription();

  constructor(private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    const success = this.success$.subscribe(msg => {
      this.snackBar.open(msg, 'DISMISS', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3000,
        panelClass: ['snackbar-success-message']
      });
    });
    const error = this.error$.subscribe(msg => {
      this.snackBar.open(msg, 'DISMISS', {
        horizontalPosition: 'end',
        verticalPosition: 'top',
        duration: 3000,
        panelClass: ['snackbar-error-message']
      });
    });
    this.subscriptions.add(success).add(error);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
