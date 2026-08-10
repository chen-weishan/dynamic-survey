import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { SurveyService } from '../../../services/survey.service';
import { SurveyStats, QuestionStats } from '../../../models/survey-stats.model';
@Component({
  selector: 'app-survey-stats',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RouterLink,
    BaseChartDirective,
  ],
  templateUrl: './survey-stats.component.html',
  styleUrl: './survey-stats.component.scss',
})
export class SurveyStatsComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private route = inject(ActivatedRoute);
  stats = signal<SurveyStats | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id)
      this.surveyService.getSurveyStats(Number(id)).subscribe({
        next: (data) => this.stats.set(data),
        error: (err) => console.error('無法載入統計數據', err),
      });
  }
  // 把後端統計 Map 轉成 Chart.js 圓餅圖資料
  getChartData(q: QuestionStats): ChartData<'pie'> {
    if (!q.optionStats) return { labels: [], datasets: [] };
    return {
      labels: Object.values(q.optionStats).map((o) => o.optionText),
      datasets: [
        {
          data: Object.values(q.optionStats).map((o) => o.count),
          backgroundColor: [
            '#4F46E5',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#EC4899',
          ],
        },
      ],
    };
  }
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
  };
}
