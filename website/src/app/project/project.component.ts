import {Component, Inject, LOCALE_ID, OnInit} from '@angular/core';
import {Project} from './models/project';
import {ProjectService} from './project.service';
import {NavigationExtras, Router} from '@angular/router';
import {LoaderService} from '../loader.service';
import {formatDate} from '@angular/common';
import {environment} from '../../environments/environment';
import {AlertDialogComponent} from '../common/alert-dialog/alert-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ServerListDialogComponent} from './server-list-dialog/server-list-dialog.component';
import {delay} from 'rxjs/operators';

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css']
})
export class ProjectComponent implements OnInit {

  projects: Project[] = [];
  showProgress = false;
  projectName = '';

  constructor(private router: Router,
              private projectService: ProjectService,
              public loaderService: LoaderService,
              private dialog: MatDialog,
              @Inject(LOCALE_ID) public locale: string) {
  }

  ngOnInit(): void {
    this.loaderService.loaderState.pipe(delay(0)).subscribe((show) => {
      this.showProgress = show;
    });

    this.projectService.getProjects().subscribe((response) => {
      if (response.success) {
        this.projects = response.data;
      }
    }, error => {
      console.log(error);
    });
  }

  onEditClicked(project: Project): void {
    const navigationExtras: NavigationExtras = {};

    // Open map
    setTimeout(() => {
      this.router.navigate([`/project/${project.id}`], navigationExtras);
    }, 300);
  }

  onConfigClicked(project: Project): void {
    const dialogRef = this.dialog.open(ServerListDialogComponent, {
      minHeight: '80vh',
      height: 'auto',
      width: '500px'
    });
    dialogRef.afterClosed().subscribe(server => {
      if (server) {
        this.projectService.updateGCSUrl(project.id, server.backend_url, server.frontend_url).subscribe(() => {
          project.gcs_url = server.backend_url;
          project.gcs_login_url = server.frontend_url;
          console.log('gcs url updated for project: ', project);
        }, error => {
          console.log('gcs url update error: ' + error);
        });
      }
    });
  }

  onDeleteClicked(project: Project): void {
    AlertDialogComponent.show(this.dialog, {
      title: 'Delete Project?',
      msg: 'This action is irreversible and permanently deletes project\'s data. Type "delete" below to confirm',
      positiveText: 'Confirm',
      negativeText: 'Cancel',
      showInput: true
    }, '500px').subscribe(inputText => {
      if (inputText === 'delete') {
        this.projectService.deleteProject(project.id).subscribe((response) => {
          if (response.success) {
            this.projects.splice(this.projects.indexOf(project), 1);
          }
        }, error => {
          console.log(error);
        });
      }
    });
  }

  onCreateClicked(): void {
    if (this.projectName.length > 0) {
      this.projectService.createProject(this.projectName).subscribe((response) => {
        if (response.success) {
          const project = response.data;
          this.projects.push(project);
          this.onEditClicked(project);
        }
      }, error => {
        console.log(error);
      });
      this.projectName = '';
    }
  }

  getProjectDate(project: Project): string {
    return formatDate(project.createdAt, environment.dateFormat, this.locale);
  }
}
