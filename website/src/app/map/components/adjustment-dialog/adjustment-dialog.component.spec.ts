import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdjustmentDialogComponent } from './adjustment-dialog.component';

describe('AdjustmentDialogComponent', () => {
  let component: AdjustmentDialogComponent;
  let fixture: ComponentFixture<AdjustmentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdjustmentDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdjustmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
