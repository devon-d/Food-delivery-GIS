import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerListDialogComponent } from './server-list-dialog.component';

describe('ServerListDialogComponent', () => {
  let component: ServerListDialogComponent;
  let fixture: ComponentFixture<ServerListDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServerListDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServerListDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
