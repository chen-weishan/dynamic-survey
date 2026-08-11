import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { SurveyService } from '../../services/survey.service';
import { Survey, TimeStatus, getTimeStatus } from '../../models/survey.model';
@Component({
  selector: 'app-survey-search',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatChipsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatIconModule,
  ],
  templateUrl: './survey-search.component.html',
  styleUrl: './survey-search.component.scss',
})
export class SurveySearchComponent implements OnInit {
  private surveyService = inject(SurveyService);
  surveys = signal<Survey[]>([]);
  displayedColumns = ['id', 'title', 'status', 'period', 'result'];
  titleFilter = '';
  /** matDatepicker 綁的是 Date 物件；送給後端前才轉成 yyyy-MM-dd */
  startDate: Date | null = null;
  endDate: Date | null = null;
  pageIndex = signal(0);
  pageSize = signal(10);
  pagedSurveys = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.surveys().slice(start, start + this.pageSize());
  });
  private readonly TIME_STATUS_LABEL: Record<TimeStatus, string> = {
    NOT_STARTED: '尚未開始',
    ONGOING: '進行中',
    ENDED: '已結束',
  };
  ngOnInit() {
    this.loadSurveys();
  }
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
        error: () => this.surveys.set([]),
      });
  }
  onSearch() {
    this.loadSurveys();
  }
  onPageChange(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }
  // 三個方法都吃 getTimeStatus(s) 現算的結果，Template 直接呼叫就好
  timeStatusOf(s: Survey): TimeStatus | null {
    return getTimeStatus(s);
  }
  statusLabel(s: Survey): string {
    return this.TIME_STATUS_LABEL[this.timeStatusOf(s)!];
  }
  canFill(s: Survey): boolean {
    return this.timeStatusOf(s) === 'ONGOING';
  }
  canViewStats(s: Survey): boolean {
    return this.timeStatusOf(s) !== 'NOT_STARTED';
  }
}
