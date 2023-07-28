import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {IProjectSettings} from '../../../project/models/project';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialogComponent implements OnInit {
  formGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<SettingsDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: IProjectSettings) {
    this.formGroup = formBuilder.group({
      flightAltitude: new FormControl(data.flight_altitude_m, [
        Validators.required,
        Validators.pattern('[0-9]+')
      ]),
      maxConnectorDistance: new FormControl(data.max_connector_distance, [
        Validators.required,
        Validators.pattern('[0-9]+')
      ]),
      buildingRadius: new FormControl(data.building_radius, [
        Validators.required,
        Validators.pattern('\\-?\\d*\\.?\\d{1,5}')
      ]),
      visualizeAltitude: data.show_flight_altitude,
    });
  }

  static show(dialog: MatDialog, data: IProjectSettings, width: string = '500px'): Observable<IProjectSettings> {
    const dialogRef = dialog.open(SettingsDialogComponent, {width, data});
    return dialogRef.afterClosed();
  }

  ngOnInit(): void {
  }

  onPositive(): void {
    this.data.flight_altitude_m = Number(this.formGroup.get('flightAltitude').value);
    this.data.max_connector_distance = Number(this.formGroup.get('maxConnectorDistance').value);
    this.data.building_radius = Number(this.formGroup.get('buildingRadius').value);
    this.data.show_flight_altitude = this.formGroup.get('visualizeAltitude').value;
    this.dialogRef.close(this.data);
  }

  onNegative(): void {
    this.dialogRef.close();
  }
}
