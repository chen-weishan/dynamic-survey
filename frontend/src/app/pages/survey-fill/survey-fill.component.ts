import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SurveyService } from '../../services/survey.service';
import { Survey, Question } from '../../models/survey.model';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-survey-fill',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './survey-fill.component.html',
  styleUrl: './survey-fill.component.scss',
})
export class SurveyFillComponent implements OnInit {
  private fb = inject(FormBuilder);
  private surveyService = inject(SurveyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  survey = signal<Survey | null>(null);
  fillForm: FormGroup = this.fb.group({});
  isConfirmPage = signal(false); // 是否在確認頁
  previewData = signal<any>(null); // 確認頁顯示資料

  constructor() {
    /* currentUser 是非同步載入的（AuthService 建構時才打 /users/profile），
       而問卷也要等 API 回來才建表單 —— 兩件事誰先到都有可能。
       用 effect 同時盯住兩個來源，哪一邊後到都會補帶入。 */
    effect(() => {
      const user = this.auth.currentUser();
      this.survey(); // 建立相依：表單重建後要重新帶入
      if (user) this.prefillFromUser();
    });
  }

  /** 只填空白且未被使用者動過的欄位，不覆蓋已輸入的內容 */
  private prefillFromUser() {
    const user = this.auth.currentUser();
    if (!user) return;
    const fields: Array<[string, string | undefined]> = [
      ['name', user.name],
      ['email', user.email],
      ['phone', user.phone],
    ];
    for (const [key, value] of fields) {
      const ctrl = this.fillForm.get(key);
      if (!ctrl || !value) continue;
      if (ctrl.dirty || ctrl.value) continue;
      ctrl.setValue(value);
    }
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadSurvey(Number(id));
  }

  loadSurvey(id: number) {
    this.surveyService.getSurveyById(id).subscribe({
      next: (data) => {
        this.survey.set(data);
        this.buildForm(data.questions);
      },
      error: () =>
        this.snackBar.open('無法載入問卷', '關閉', { duration: 3000 }),
    });
  }
  private buildForm(questions: Question[]) {
    const group: any = {
      name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9-]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      age: [null],
    };
    questions.forEach((q) => {
      group[q.id!] =
        q.type === 'MULTI'
          ? this.fb.array([], q.required ? Validators.required : null)
          : ['', q.required ? Validators.required : null];
    });
    this.fillForm = this.fb.group(group);
  }
  onCheckboxChange(questionId: number, optionId: number, checked: boolean) {
    const arr = this.fillForm.get(questionId.toString()) as FormArray;
    if (checked) arr.push(this.fb.control(optionId));
    else arr.removeAt(arr.controls.findIndex((x) => x.value === optionId));
  }
  // 第一步：點「下一步」存入 Session 並切換確認頁
  onGoToConfirm() {
    if (this.fillForm.invalid) {
      this.snackBar.open('請填寫所有必填欄位', '關閉', { duration: 3000 });
      return;
    }
    const submission = this.formatSubmission(this.fillForm.value);
    this.surveyService.saveToSession(submission).subscribe({
      next: (res) => {
        if (res.code === 200) {
          this.isConfirmPage.set(true);
          this.previewData.set(submission);
          window.scrollTo(0, 0);
        } else this.snackBar.open(res.message, '關閉', { duration: 3000 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.message || '傳送失敗', '關閉', {
          duration: 3000,
        }),
    });
  }
  // 第二步：確認頁點「確認提交」
  onFinalSubmit() {
    if (!confirm('確定要送出問卷嗎？送出後將無法修改。')) return;
    this.surveyService.confirmSubmit().subscribe({
      next: (res) => {
        if (res.code === 200) {
          this.snackBar.open('問卷提交成功！', '關閉', { duration: 3000 });
          this.router.navigate(['/home']);
        } else this.snackBar.open(res.message, '關閉', { duration: 3000 });
      },
      error: () =>
        this.snackBar.open('提交失敗，請稍後再試', '關閉', { duration: 3000 }),
    });
  }
  // 把表單值轉成後端 ResponseDTO 格式
  private formatSubmission(formValue: any) {
    const s = this.survey()!;
    return {
      surveyId: s.id,
      name: formValue.name,
      phone: formValue.phone,
      email: formValue.email,
      age: formValue.age,
      answers: this.formatAnswers(formValue, s),
    };
  }
  // 將各題作答轉為後端格式
  private formatAnswers(formValue: any, s: Survey) {
    return Object.keys(formValue)
      .filter((k) => !['name', 'phone', 'email', 'age'].includes(k))
      .map((qId) => {
        const val = formValue[qId];
        const q = s.questions.find((x) => x.id === Number(qId))!;
        return {
          questionId: Number(qId),
          optionIds: q.type === 'TEXT' ? [] : Array.isArray(val) ? val : [val],
          answerText: q.type === 'TEXT' ? val : null,
        };
      });
  }

  // 確認頁用：由題目 ID + 選項 ID 反查選項文字
  getOptionText(questionId: number, optionId: number): string {
    const q = this.survey()?.questions.find((x) => x.id === questionId);
    return q?.options.find((o) => o.id === optionId)?.optionText ?? '';
  }
}
