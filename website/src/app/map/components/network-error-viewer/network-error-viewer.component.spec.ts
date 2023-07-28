import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkErrorViewerComponent } from './network-error-viewer.component';

describe('NetworkErrorViewerComponent', () => {
  let component: NetworkErrorViewerComponent;
  let fixture: ComponentFixture<NetworkErrorViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkErrorViewerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkErrorViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
