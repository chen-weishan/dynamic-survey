import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SurveyService } from '../../../services/survey.service';
import {
  Survey,
  TimeStatus,
  SurveySortKey,
  SortDir,
  getTimeStatus,
  sortSurveys,
} from '../../../models/survey.model';
@Component({
  selector: 'app-survey-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatSnackBarModule,
  ],
  templateUrl: './survey-list.component.html',
  styleUrl: './survey-list.component.scss',
})
export class SurveyListComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  surveys = signal<Survey[]>([]);
  displayedColumns = ['id', 'title', 'status', 'period', 'actions'];
  // 搜尋欄位 (雙向綁定用一般屬性，不是 signal)
  titleFilter = '';
  /** matDatepicker 綁的是 Date 物件；送給後端前才轉成 yyyy-MM-dd */
  startDate: Date | null = null;
  endDate: Date | null = null;

  ngOnInit() {
    this.loadSurveys();
  }
  pageIndex = signal(0);
  pageSize = signal(10);

  /** 目前的排序欄位與方向；null 代表照後端回傳的順序 */
  sortKey = signal<SurveySortKey | null>(null);
  sortDir = signal<SortDir>('asc');

  /** 排序是純前端的：資料量小，不值得為它多跑一趟後端 */
  private sorted = computed(() =>
    sortSurveys(this.surveys(), this.sortKey(), this.sortDir()),
  );

  // 目前這一頁要顯示的資料 (前端分頁：從排序後的陣列切一段出來)
  pagedSurveys = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });
  /** 空值要送空字串（後端把它當「不過濾」），不能送 'null' */
  private asApiDate(d: Date | null): string {
    return d ? formatDate(d, 'yyyy-MM-dd', 'en-US') : '';
  }

  loadSurveys() {
    this.surveyService
      .getAllSurveys(
        this.titleFilter,
        this.asApiDate(this.startDate),
        this.asApiDate(this.endDate),
      )
      .subscribe({
        next: (data) => {
          this.surveys.set(data);
          this.pageIndex.set(0);
        },
        error: () =>
          this.snackBar.open('無法載入問卷列表', '關閉', { duration: 3000 }),
      });
  }
  onSearch() {
    this.loadSurveys();
  }

  /** 清除全部條件並重新載入（沒有條件＝顯示所有問卷） */
  onClear() {
    this.titleFilter = '';
    this.startDate = null;
    this.endDate = null;
    this.loadSurveys();
  }

  /** 同一欄再按一次換方向，換一欄則從正序開始 */
  toggleSort(key: SurveySortKey) {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.pageIndex.set(0);
  }

  /** 表頭箭頭圖示：未排序的欄位顯示雙向箭頭 */
  sortIcon(key: SurveySortKey): string {
    if (this.sortKey() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }
  onPageChange(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }
  onEdit(s: Survey) {
    this.router.navigate(['/admin/edit', s.id]);
  }

  // 切換發佈 / 草稿
  toggleStatus(survey: Survey) {
    const newStatus = survey.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    this.surveyService.saveSurvey({ ...survey, status: newStatus }).subscribe({
      next: () => {
        this.snackBar.open('狀態已更新', '關閉', { duration: 2000 });
        this.loadSurveys();
      },
      error: () =>
        this.snackBar.open('狀態更新失敗', '關閉', { duration: 3000 }),
    });
  }
  onDelete(id: number) {
    if (confirm('確定要刪除這份問卷嗎？')) {
      this.surveyService.deleteSurvey(id).subscribe({
        next: () => {
          this.snackBar.open('問卷已刪除', '關閉', { duration: 3000 });
          this.loadSurveys();
        },
        error: () => this.snackBar.open('刪除失敗', '關閉', { duration: 3000 }),
      });
    }
  }
  private readonly TIME_STATUS_LABEL: Record<TimeStatus, string> = {
    NOT_STARTED: '尚未開始',
    ONGOING: '進行中',
    ENDED: '已結束',
  };

  // 包一層呼叫 models 檔案裡的 getTimeStatus 純函式，Template 才能呼叫
  timeStatusOf(s: Survey): TimeStatus | null {
    return getTimeStatus(s);
  }

  // 狀態欄要顯示的文字：草稿直接顯示「草稿」，已發佈才顯示日期算出的三態
  statusLabel(s: Survey): string {
    return s.status === 'DRAFT'
      ? '草稿'
      : this.TIME_STATUS_LABEL[this.timeStatusOf(s)!];
  }

  // 「結果」連結是否可點：只有已發佈、且進行中或已結束才能看統計 (尚未開始還沒資料)
  canViewStats(s: Survey): boolean {
    return s.status === 'PUBLISHED' && this.timeStatusOf(s) !== 'NOT_STARTED';
  }
}
