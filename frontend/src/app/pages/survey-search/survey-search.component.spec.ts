import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveySearchComponent } from './survey-search.component';

describe('SurveySearchComponent', () => {
  let component: SurveySearchComponent;
  let fixture: ComponentFixture<SurveySearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveySearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SurveySearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
