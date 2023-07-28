import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyLayerComponent } from './survey-layer.component';

describe('PointsLayerComponent', () => {
  let component: SurveyLayerComponent;
  let fixture: ComponentFixture<SurveyLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SurveyLayerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SurveyLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
