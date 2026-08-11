import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SurveyService } from '../../../services/survey.service';
import { Survey } from '../../../models/survey.model';
@Component({
  selector: 'app-survey-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatSnackBarModule,
  ],
  templateUrl: './survey-editor.component.html',
  styleUrl: './survey-editor.component.scss',
})
export class SurveyEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private surveyService = inject(SurveyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  surveyId = signal<number | null>(null);
  activeStep = signal(0); // 0:基本資料 1:題目設定 2:預覽確認
  surveyForm: FormGroup;

  questionTypes = [
    { label: '單選', value: 'SINGLE' },
    { label: '多選', value: 'MULTI' },
    { label: '文字', value: 'TEXT' },
  ];
  constructor() {
    this.surveyForm = this.fb.group({
      id: [null],
      title: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(300)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      questions: this.fb.array([]), // 巢狀 FormArray
    });
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.surveyId.set(Number(id));
      this.loadSurvey(Number(id));
    } else this.addQuestion(); // 新增模式預設一題
  }

  get questionsArray(): FormArray {
    return this.surveyForm.get('questions') as FormArray;
  }
  getOptionsArray(i: number): FormArray {
    return this.questionsArray.at(i).get('options') as FormArray;
  }
  addQuestion() {
    const qGroup = this.fb.group({
      id: [null],
      title: ['', Validators.required],
      type: ['SINGLE', Validators.required],
      required: [true],
      options: this.fb.array([]),
    });
    this.addOption(qGroup.get('options') as FormArray); // 預設兩個選項
    this.addOption(qGroup.get('options') as FormArray);
    this.questionsArray.push(qGroup);
  }
  removeQuestion(i: number) {
    this.questionsArray.removeAt(i);
  }
  addOption(optionsArray: FormArray) {
    optionsArray.push(
      this.fb.group({ id: [null], optionText: ['', Validators.required] }),
    );
  }
  removeOption(qi: number, oi: number) {
    this.getOptionsArray(qi).removeAt(oi);
  }

  /** rail 的滑塊位置：把題型換算成 0/1/2 餵給 CSS 的 --i */
  typeIndex(qi: number): number {
    const type = this.questionsArray.at(qi).get('type')?.value;
    const idx = this.questionTypes.findIndex((t) => t.value === type);
    return idx < 0 ? 0 : idx;
  }

  /** rail 的按鈕取代了 mat-button-toggle，要自己寫回 FormControl */
  setType(qi: number, type: string) {
    this.questionsArray.at(qi).get('type')?.setValue(type);
    this.onTypeChange(qi);
  }

  // 切換為文字題時清空選項；切回選擇題時補回選項
  onTypeChange(qi: number) {
    const options = this.getOptionsArray(qi);
    if (this.questionsArray.at(qi).get('type')?.value === 'TEXT')
      options.clear();
    else if (options.length === 0) {
      this.addOption(options);
      this.addOption(options);
    }
  }

  // STEP 0 的欄位是否有無效值
  private basicInfoInvalid(): boolean {
    return ['title', 'description', 'startDate', 'endDate'].some(
      (name) => this.surveyForm.get(name)?.invalid,
    );
  }

  // 進確認頁前，整理成 DTO 並存入 Session
  goToConfirm() {
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched(); // 讓無效欄位標紅
      // 錯的是基本資料時切回 STEP 0，否則使用者看不到出問題的欄位
      if (this.basicInfoInvalid()) this.activeStep.set(0);
      this.snackBar.open('請填寫完整資訊', '關閉', { duration: 3000 });
      return;
    }
    const fv = this.surveyForm.value;
    const surveyData: Survey = {
      ...fv,
      status: 'DRAFT',
      startDate: formatDate(fv.startDate, 'yyyy-MM-dd', 'en-US'),
      endDate: formatDate(fv.endDate, 'yyyy-MM-dd', 'en-US'),
      questions: fv.questions.map((q: any, i: number) => ({
        ...q,
        orderIndex: i,
        options: q.options.map((o: any, j: number) => ({
          ...o,
          orderIndex: j,
        })),
      })),
    };
    this.surveyService.saveAdminSurveyToSession(surveyData).subscribe(() => {
      this.activeStep.set(2);
      window.scrollTo(0, 0);
    });
  }
  onFinalSubmit(isPublish: boolean) {
    if (!confirm(`確定要${isPublish ? '儲存並發佈' : '僅儲存'}嗎？`)) return;
    this.surveyService.confirmAdminSubmit(isPublish).subscribe({
      next: () => {
        this.snackBar.open('問卷處理完成', '關閉', { duration: 2000 });
        setTimeout(() => this.router.navigate(['/admin']), 1000);
      },
      error: (err) =>
        this.snackBar.open(err.error?.message || '問卷處理失敗', '關閉', {
          duration: 3000,
        }),
    });
  }
  loadSurvey(id: number) {
    this.surveyService.getAdminSurveyById(id).subscribe({
      next: (s) => {
        // 1. 更新基本資料
        this.surveyForm.patchValue({
          id: s.id,
          title: s.title,
          description: s.description,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
        });

        // 2. 清空並重建題目與選項 FormArray
        this.questionsArray.clear();
        s.questions.forEach((q) => {
          this.questionsArray.push(
            this.fb.group({
              id: [q.id],
              title: [q.title, Validators.required],
              type: [q.type, Validators.required],
              required: [q.required],
              options: this.fb.array(
                (q.options || []).map((o) =>
                  this.fb.group({
                    id: [o.id],
                    optionText: [o.optionText, Validators.required],
                  }),
                ),
              ),
            }),
          );
        });
      },
      error: (err) => {
        this.snackBar.open('載入問卷失敗', '關閉', { duration: 3000 });
      },
    });
  }
}
