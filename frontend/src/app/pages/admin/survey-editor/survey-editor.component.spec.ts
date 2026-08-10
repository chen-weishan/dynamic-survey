import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

import { SurveyEditorComponent } from './survey-editor.component';

describe('SurveyEditorComponent', () => {
  let component: SurveyEditorComponent;
  let fixture: ComponentFixture<SurveyEditorComponent>;

  // 模擬使用者在畫面上打字
  function typeInto(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function inputs(): HTMLInputElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('input[type="text"], input:not([type])'),
    );
  }

  function clickButtonWithText(text: string) {
    const btn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.includes(text)) as
      | HTMLButtonElement
      | undefined;
    if (!btn) throw new Error(`找不到按鈕：${text}`);
    btn.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyEditorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideNativeDateAdapter(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('填完畫面上所有欄位後，按「下一步：預覽確認」應進入預覽步驟', () => {
    // STEP 0：填完畫面上看得到的所有欄位
    const byName = (name: string) =>
      fixture.nativeElement.querySelector(
        `[formControlName="${name}"]`,
      ) as HTMLInputElement;
    typeInto(byName('title'), '員工滿意度調查');
    typeInto(byName('startDate'), '2026-01-01');
    typeInto(byName('endDate'), '2026-12-31');
    clickButtonWithText('下一步：設定題目');

    // STEP 1：題目標題 + 全部選項
    expect(component.activeStep()).toBe(1);
    const step1Inputs = inputs();
    typeInto(step1Inputs[0], '你最喜歡哪個顏色？');
    step1Inputs.slice(1).forEach((el, i) => typeInto(el, `選項 ${i + 1}`));

    clickButtonWithText('下一步：預覽確認');

    // 表單必須通過驗證（bug 時這裡為 false，只會跳「請填寫完整資訊」）
    expect(component.surveyForm.valid).toBe(true);

    // 放行暫存到 Session 的請求
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.match(() => true).forEach((req) => req.flush({}));
    fixture.detectChanges();

    expect(component.activeStep()).toBe(2);
  });

  it('基本資料沒填完時，應切回 STEP 0 並標記欄位為 touched', () => {
    // 只填題目與選項，STEP 0 留空
    component.activeStep.set(1);
    fixture.detectChanges();
    const step1Inputs = inputs();
    typeInto(step1Inputs[0], '你最喜歡哪個顏色？');
    step1Inputs.slice(1).forEach((el, i) => typeInto(el, `選項 ${i + 1}`));

    clickButtonWithText('下一步：預覽確認');

    expect(component.activeStep()).toBe(0);
    expect(component.surveyForm.get('title')?.touched).toBe(true);
  });

  it('題目沒填完時，應留在 STEP 1', () => {
    const byName = (name: string) =>
      fixture.nativeElement.querySelector(
        `[formControlName="${name}"]`,
      ) as HTMLInputElement;
    typeInto(byName('title'), '員工滿意度調查');
    typeInto(byName('startDate'), '2026-01-01');
    typeInto(byName('endDate'), '2026-12-31');
    clickButtonWithText('下一步：設定題目');

    // 題目標題與選項都不填，直接下一步
    clickButtonWithText('下一步：預覽確認');

    expect(component.activeStep()).toBe(1);
    expect(component.questionsArray.at(0).get('title')?.touched).toBe(true);
  });
});
