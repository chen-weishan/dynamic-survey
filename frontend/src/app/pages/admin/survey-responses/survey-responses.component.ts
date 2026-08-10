import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { SurveyService } from '../../../services/survey.service';
@Component({
  selector: 'app-survey-responses',
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule],
  templateUrl: './survey-responses.component.html', styleUrl: './survey-responses.component.scss'
})
export class SurveyResponsesComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private route = inject(ActivatedRoute);

  responses = signal<any[]>([]);
  displayedColumns = ['index', 'userName', 'submittedAt', 'actions'];

  ngOnInit() {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (surveyId) {
      this.surveyService.getSurveyResponses(Number(surveyId)).subscribe({
        next: (data) => this.responses.set(data),
        error: () => this.responses.set([])
      });
    }
  }
}
