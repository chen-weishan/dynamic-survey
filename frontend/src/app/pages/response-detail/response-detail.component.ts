import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { SurveyService } from '../../services/survey.service';
@Component({
  selector: 'app-response-detail',
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule],
  templateUrl: './response-detail.component.html',
  styleUrl: './response-detail.component.scss',
})
export class ResponseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  detail = signal<any>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('responseId');
    if (id) {
      this.surveyService
        .getResponseDetail(Number(id))
        .subscribe({ next: (data) => this.detail.set(data) });
    }
  }
}
