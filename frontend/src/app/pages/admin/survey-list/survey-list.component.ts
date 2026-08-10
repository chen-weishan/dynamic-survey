import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SurveyService } from '../../../services/survey.service';
import {
  Survey,
  TimeStatus,
  getTimeStatus,
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
  startDateFilter = '';
  endDateFilter = '';

  ngOnInit() {
    this.loadSurveys();
  }
  pageIndex = signal(0);
  pageSize = signal(10);

  // 目前這一頁要顯示的資料 (前端分頁：從完整陣列切一段出來)
  pagedSurveys = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.surveys().slice(start, start + this.pageSize());
  });
  loadSurveys() {
    this.surveyService
      .getAllSurveys(this.titleFilter, this.startDateFilter, this.endDateFilter)
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
