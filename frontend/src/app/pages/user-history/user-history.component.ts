import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SurveyService } from '../../services/survey.service';
@Component({
  selector: 'app-user-history',
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './user-history.component.html',
  styleUrl: './user-history.component.scss',
})
export class UserHistoryComponent implements OnInit {
  private surveyService = inject(SurveyService);
  history = signal<any[]>([]);
  displayedColumns = ['index', 'surveyTitle', 'submittedAt', 'actions'];

  ngOnInit() {
    this.surveyService.getUserHistory().subscribe({
      next: (data) => this.history.set(data),
      error: (err) => console.error('無法載入歷史紀錄', err),
    });
  }
}
