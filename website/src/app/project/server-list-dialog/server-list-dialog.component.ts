import {Component, OnInit, ViewChild} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {GcsService} from '../../common/services/gcs.service';
import {GcsServer} from '../../common/models/gcs-server';
import {MatSelectionList} from '@angular/material/list';

@Component({
  selector: 'app-server-list-dialog',
  templateUrl: './server-list-dialog.component.html',
  styleUrls: ['./server-list-dialog.component.css']
})
export class ServerListDialogComponent implements OnInit {

  showProgress = false;
  servers: GcsServer[] = [];
  @ViewChild('serverList') serverListComponent: MatSelectionList;

  constructor(public dialogRef: MatDialogRef<ServerListDialogComponent>,
              private gcsService: GcsService) {
  }

  ngOnInit(): void {
    this.showProgress = true;
    this.gcsService.getGCSServers().subscribe((response) => {
      this.servers = response.data;
      this.showProgress = false;
    }, (error) => {
      console.log(error);
      this.showProgress = false;
    });
  }

  onNegative(): void {
    this.dialogRef.close();
  }

  onPositive(): void {
    const selectedServer = this.serverListComponent.selectedOptions.selected[0]?.value;
    this.dialogRef.close(selectedServer);
  }
}
