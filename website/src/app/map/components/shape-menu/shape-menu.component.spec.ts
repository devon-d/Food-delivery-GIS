import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShapeMenuComponent } from './shape-menu.component';

describe('ShapeMenuComponent', () => {
  let component: ShapeMenuComponent;
  let fixture: ComponentFixture<ShapeMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShapeMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShapeMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
