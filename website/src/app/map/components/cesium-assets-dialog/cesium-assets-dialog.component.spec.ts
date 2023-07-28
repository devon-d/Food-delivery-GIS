import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CesiumAssetsDialogComponent } from './cesium-assets-dialog.component';

describe('CesiumAssetsDialogComponent', () => {
  let component: CesiumAssetsDialogComponent;
  let fixture: ComponentFixture<CesiumAssetsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CesiumAssetsDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CesiumAssetsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
