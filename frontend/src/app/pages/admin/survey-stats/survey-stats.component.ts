import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SurveyService } from '../../../services/survey.service';
import { SurveyStats, QuestionStats } from '../../../models/survey-stats.model';
import { ThemeService } from '../../../services/theme.service';
import { CountUpDirective } from '../../../shared/count-up.directive';

/**
 * 呈現方式的識別碼。
 *
 * 刻意不直接用 Chart.js 的 type 當 key：'bar' 與 'hbar' 是同一個 chart type，
 * 差別只在 options.indexAxis，用 type 當 key 就分不出這兩種。
 */
export type ChartKind =
  | 'pie'
  | 'doughnut'
  | 'bar'
  | 'hbar'
  | 'polarArea'
  | 'radar'
  | 'list'
  | 'cards';

interface KindOption {
  kind: ChartKind;
  label: string;
  icon: string;
}

/** 各題型可切換的呈現方式。陣列第一個就是預設值。 */
const KINDS_BY_TYPE: Record<QuestionStats['type'], KindOption[]> = {
  SINGLE: [
    { kind: 'doughnut', label: '甜甜圈', icon: 'donut_large' },
    { kind: 'pie', label: '圓餅圖', icon: 'pie_chart' },
    { kind: 'bar', label: '長條圖', icon: 'bar_chart' },
  ],
  MULTI: [
    { kind: 'hbar', label: '橫向長條', icon: 'align_horizontal_left' },
    { kind: 'bar', label: '長條圖', icon: 'bar_chart' },
    { kind: 'doughnut', label: '甜甜圈', icon: 'donut_large' },
    { kind: 'radar', label: '雷達圖', icon: 'radar' },
  ],
  TEXT: [
    { kind: 'list', label: '清單', icon: 'view_list' },
    { kind: 'cards', label: '卡片牆', icon: 'grid_view' },
  ],
};

/** kind → Chart.js 的 type */
const CHART_TYPE_OF: Partial<Record<ChartKind, ChartType>> = {
  pie: 'pie',
  doughnut: 'doughnut',
  bar: 'bar',
  hbar: 'bar',
  polarArea: 'polarArea',
  radar: 'radar',
};

/**
 * 12 色循環。全部落在紫→青→粉的色相帶上，和全站的 aurora 背景同一組色，
 * 不用 Chart.js 預設那組（紅橙黃綠藍）—— 那組放在紫色玻璃上會像另一個網站。
 */
const PALETTE = [
  '#7C5CFF',
  '#22C7A9',
  '#FF9F43',
  '#FF6B8A',
  '#4CC3F0',
  '#C084FC',
  '#F5C542',
  '#5B8DEF',
  '#EC5F9E',
  '#2DD4A7',
  '#A78BFA',
  '#FB7185',
];

@Component({
  selector: 'app-survey-stats',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    BaseChartDirective,
    CountUpDirective,
  ],
  templateUrl: './survey-stats.component.html',
  styleUrl: './survey-stats.component.scss',
})
export class SurveyStatsComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private route = inject(ActivatedRoute);
  private theme = inject(ThemeService);
  stats = signal<SurveyStats | null>(null);

  /**
   * 每題各自選的呈現方式。
   *
   * 用「整個 Map 換掉」而不是就地 set —— signal 比對的是參照，
   * 就地改動不會觸發 computed 重算，圖表就不會換。
   */
  private kindOverrides = signal<ReadonlyMap<number, ChartKind>>(new Map());

  /**
   * 每題的圖表物件快取。
   *
   * 只有「這一題的呈現方式」或「主題深淺」變了才重建，其餘題目沿用同一個物件參照。
   * 少了這層，切換某一題的圖表會讓 computed 重跑、每題都拿到新物件，
   * ng2-charts 看到 data input 換參照就整張重畫 —— 症狀是動到一題、全頁重跑進場動畫。
   */
  private chartCache = new Map<
    number,
    {
      kind: ChartKind;
      dark: boolean;
      data: ChartData;
      options: ChartConfiguration['options'];
    }
  >();

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id)
      this.surveyService.getSurveyStats(Number(id)).subscribe({
        next: (data) => {
          this.chartCache.clear();
          this.stats.set(data);
        },
        error: (err) => console.error('無法載入統計數據', err),
      });
  }

  kindsFor(q: QuestionStats): KindOption[] {
    return KINDS_BY_TYPE[q.type];
  }

  kindOf(q: QuestionStats): ChartKind {
    return this.kindOverrides().get(q.questionId) ?? KINDS_BY_TYPE[q.type][0].kind;
  }

  setKind(q: QuestionStats, kind: ChartKind) {
    const next = new Map(this.kindOverrides());
    next.set(q.questionId, kind);
    this.kindOverrides.set(next);
  }

  /**
   * 明細列表的資料來源。
   *
   * 原本 template 用 `optionStats | keyvalue`，keyvalue 會照 key 的字串排序，
   * 於是 10 個選項會排成 1,10,2,3…，和圖表的順序對不起來（圖表走 Object.values）。
   * 兩邊改吃同一個來源就一致了。
   */
  optionList(q: QuestionStats) {
    return Object.values(q.optionStats ?? {});
  }

  /** 明細列表左邊的色點，要和圖表同一色序 */
  colorAt(i: number): string {
    return PALETTE[i % PALETTE.length];
  }

  chartTypeOf(q: QuestionStats): ChartType {
    return CHART_TYPE_OF[this.kindOf(q)] ?? 'doughnut';
  }

  /**
   * 圖表資料必須快取，不能在 template 直接呼叫方法。
   *
   * 方法每次變更偵測都會回傳「新的物件」，ng2-charts 看到 data input 換了參照
   * 就重繪整張圖（連帶重跑進場動畫）—— 症狀是一滾動圓餅圖就重跑一次。
   *
   * 這個 computed 只依賴 stats()、theme.isDark() 與使用者選的呈現方式，
   * 滾動不會讓它重算，參照因此保持穩定。
   */
  readonly chartDataById = computed(() => {
    const map = new Map<number, ChartData>();
    for (const q of this.stats()?.questionStats ?? []) {
      if (q.type === 'TEXT') continue;
      map.set(q.questionId, this.entryFor(q).data);
    }
    return map;
  });

  readonly chartOptionsById = computed(() => {
    const map = new Map<number, ChartConfiguration['options']>();
    for (const q of this.stats()?.questionStats ?? []) {
      if (q.type === 'TEXT') continue;
      map.set(q.questionId, this.entryFor(q).options);
    }
    return map;
  });

  /** 命中快取就原封不動回傳，參照沒變 ng2-charts 就不會重畫那張圖 */
  private entryFor(q: QuestionStats) {
    const kind = this.kindOf(q);
    const dark = this.theme.isDark();
    const hit = this.chartCache.get(q.questionId);
    if (hit && hit.kind === kind && hit.dark === dark) return hit;

    const entry = {
      kind,
      dark,
      data: this.buildChartData(q, kind),
      options: this.buildChartOptions(kind),
    };
    this.chartCache.set(q.questionId, entry);
    return entry;
  }

  // 把後端統計 Map 轉成 Chart.js 資料
  private buildChartData(q: QuestionStats, kind: ChartKind): ChartData {
    if (!q.optionStats) return { labels: [], datasets: [] };
    const entries = Object.values(q.optionStats);
    const colors = entries.map((_, i) => PALETTE[i % PALETTE.length]);
    // 圓餅類每一塊各自一色；長條/雷達是「單一數列」，整條同色才讀得出是同一組資料
    const isSliced = kind === 'pie' || kind === 'doughnut' || kind === 'polarArea';

    return {
      labels: entries.map((o) => o.optionText),
      datasets: [
        {
          label: '人數',
          data: entries.map((o) => o.count),
          backgroundColor: isSliced
            ? colors
            : kind === 'radar'
              ? 'rgba(124, 92, 255, 0.28)'
              : colors,
          borderColor:
            kind === 'radar'
              ? '#7C5CFF'
              : // 描邊要跟著主題走：預設白色在深色玻璃卡上會變成一圈搶眼的白框
                this.theme.isDark()
                ? 'rgba(45, 35, 95, 0.9)'
                : '#ffffff',
          borderWidth: kind === 'radar' ? 2 : 2,
          borderRadius: kind === 'bar' || kind === 'hbar' ? 8 : undefined,
          pointBackgroundColor: '#7C5CFF',
        } as any,
      ],
    };
  }

  /**
   * legend、座標軸的文字色必須跟著主題切換。
   * chart.js 在 canvas 裡自己畫文字、不吃 CSS 變數，預設色在深色底上幾乎讀不到。
   */
  private buildChartOptions(kind: ChartKind): ChartConfiguration['options'] {
    const dark = this.theme.isDark();
    const ink = dark ? '#EDE9FE' : '#1A1533';
    const grid = dark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(91, 63, 217, 0.14)';
    const isSliced = kind === 'pie' || kind === 'doughnut' || kind === 'polarArea';

    return {
      responsive: true,
      /* 關鍵：容器自己出高度，圖表填滿它。
         維持長寬比會讓「選項多 → legend 變高 → canvas 被推爆」，
         就是統計頁原本大片留白又超出卡片的原因。 */
      maintainAspectRatio: false,
      layout: { padding: 4 },
      plugins: {
        legend: {
          // 長條圖只有一個數列，legend 是多餘的一行字
          display: isSliced,
          position: 'top',
          labels: {
            color: ink,
            font: {
              size: 12,
              weight: 600,
              family: '"Inter Variable", "Noto Sans TC Variable", sans-serif',
            },
            boxWidth: 10,
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: dark ? 'rgba(30, 22, 66, 0.95)' : 'rgba(26, 21, 51, 0.92)',
          titleColor: '#F5F3FF',
          bodyColor: '#F5F3FF',
          padding: 10,
          cornerRadius: 10,
          displayColors: true,
        },
      },
      ...(kind === 'hbar' ? { indexAxis: 'y' as const } : {}),
      scales: isSliced
        ? undefined
        : kind === 'radar'
          ? {
              r: {
                grid: { color: grid },
                angleLines: { color: grid },
                pointLabels: { color: ink, font: { size: 11 } },
                ticks: { color: ink, backdropColor: 'transparent' },
              },
            }
          : {
              x: {
                grid: { color: grid },
                ticks: { color: ink, font: { size: 11 } },
              },
              y: {
                grid: { color: grid },
                ticks: { color: ink, font: { size: 11 }, precision: 0 },
                beginAtZero: true,
              },
            },
    } as ChartConfiguration['options'];
  }
}
