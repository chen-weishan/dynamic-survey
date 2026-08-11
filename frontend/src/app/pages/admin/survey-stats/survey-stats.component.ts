import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { ThemeService } from '../../../services/theme.service';
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
  private theme = inject(ThemeService);
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
          // 描邊要跟著主題走：chart.js 預設是白色，在深色玻璃卡上會變成一圈搶眼的白框
          borderColor: this.theme.isDark() ? 'rgba(45, 35, 95, 0.9)' : '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * legend 的文字色必須跟著主題切換。
   * chart.js 在 canvas 裡自己畫文字、不吃 CSS 變數，預設色在深色底上幾乎讀不到。
   * 用 computed 綁 ThemeService，切換主題時 options 這個 input 會變，
   * ng2-charts 就會重繪圖表。
   */
  readonly pieChartOptions = computed<ChartConfiguration<'pie'>['options']>(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: this.theme.isDark() ? '#EDE9FE' : '#1A1533',
          font: {
            size: 13,
            weight: 600,
            family: 'Inter, "Noto Sans TC", sans-serif',
          },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
    },
  }));
}
