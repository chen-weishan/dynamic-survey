import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SurveyService } from '../../services/survey.service';
import { Survey } from '../../models/survey.model';
@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private router = inject(Router);
  surveys = signal<Survey[]>([]);

  /** routerLink 只認滑鼠點擊；卡片是 div，鍵盤 Enter 要自己導 */
  goToFill(id: number) {
    this.router.navigate(['/fill', id]);
  }

  ngOnInit() {
    this.surveyService.getActiveSurveys().subscribe({
      next: (data) => this.surveys.set(data),
      error: (err) => console.error('無法載入問卷', err),
    });
  }
}
