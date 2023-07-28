import {Component, NgZone, OnInit} from '@angular/core';
import {ConnectionService} from 'ng-connection-service';
import {SyncService, SyncStatus, SyncUpdate} from '../../services/sync.service';

@Component({
  selector: 'app-cloud-sync',
  templateUrl: './cloud-sync.component.html',
  styleUrls: ['./cloud-sync.component.css']
})
export class CloudSyncComponent implements OnInit {
  eSyncStatus = SyncStatus;
  online = true;
  syncUpdate: SyncUpdate = {
    syncStatus: SyncStatus.SYNCED,
    pendingCount: 0
  };
  menuVisible = false;

  constructor(private connectionService: ConnectionService,
              private autoSaveService: SyncService,
              private ngZone: NgZone) {
  }

  ngOnInit(): void {
    this.connectionService.monitor().subscribe(isConnected => {
      this.online = isConnected;
    });
  }

  startSync(projectId: number): void {
    this.autoSaveService.start(projectId);
    this.autoSaveService.syncUpdates$.subscribe((update) => {
      this.ngZone.run(() => {
        this.syncUpdate = update;
      });
    });
  }

  stopSync(): void {
    this.autoSaveService.stop();
  }

  isSyncing(): boolean {
    return this.syncUpdate.pendingCount > 0;
  }
}
