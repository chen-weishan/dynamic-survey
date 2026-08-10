import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Survey } from '../models/survey.model';
import { SurveyStats } from '../models/survey-stats.model';
@Injectable({ providedIn: 'root' })
export class SurveyService {
  private http = inject(HttpClient);
  private readonly ADMIN_API_URL = 'http://localhost:8080/api/admin/surveys';
  private readonly PUBLIC_API_URL = 'http://localhost:8080/api/surveys';

  getActiveSurveys(): Observable<Survey[]> {
    return this.http.get<any>(this.PUBLIC_API_URL).pipe(map((res) => res.data));
  }
  // title/startDate/endDate 皆可省略，不帶等於「不篩選、查全部」
  getAllSurveys(
    title?: string,
    startDate?: string,
    endDate?: string,
  ): Observable<Survey[]> {
    const params = this.buildFilterParams(title, startDate, endDate);
    return this.http
      .get<any>(this.ADMIN_API_URL, { params })
      .pipe(map((res) => res.data));
  }
  // 組出可選的搜尋條件，值是 undefined/空字串就不加進 params
  private buildFilterParams(
    title?: string,
    startDate?: string,
    endDate?: string,
  ): HttpParams {
    let params = new HttpParams();
    if (title) params = params.set('title', title);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return params;
  }
  getAdminSurveyById(id: number): Observable<Survey> {
    return this.http
      .get<any>(`${this.ADMIN_API_URL}/${id}`)
      .pipe(map((res) => res.data));
  }
  getSurveyById(id: number): Observable<Survey> {
    return this.http
      .get<any>(`${this.PUBLIC_API_URL}/${id}/details`)
      .pipe(map((res) => res.data));
  }
  getSurveyStats(id: number): Observable<SurveyStats> {
    return this.http
      .get<any>(`${this.ADMIN_API_URL}/${id}/stats`)
      .pipe(map((res) => res.data));
  }
  // 依問卷 id 查詢所有填寫者清單 (供「查看回饋」列表用，後端已依 id 逆序排好)
  getSurveyResponses(surveyId: number): Observable<any[]> {
    return this.http
      .get<any>(`${this.ADMIN_API_URL}/${surveyId}/responses`)
      .pipe(map((res) => res.data));
  }
  getUserHistory(): Observable<any[]> {
    return this.http
      .get<any>(`${this.PUBLIC_API_URL}/history`)
      .pipe(map((res) => res.data));
  }
  // 依 responseId 查詢單筆作答的詳細內容 (供「我的紀錄」、「查看回饋」點進去查看)
  getResponseDetail(responseId: number): Observable<any> {
    return this.http
      .get<any>(`${this.ADMIN_API_URL}/response-detail/${responseId}`)
      .pipe(map((res) => res.data));
  }
  // === 前台作答 Session ===
  saveToSession(response: any): Observable<any> {
    return this.http.post<any>(
      `${this.PUBLIC_API_URL}/session-store`,
      response,
    );
  }
  confirmSubmit(): Observable<any> {
    return this.http.post<any>(`${this.PUBLIC_API_URL}/confirm`, {});
  }

  // === 後台編輯 Session ===
  saveAdminSurveyToSession(survey: Survey): Observable<any> {
    return this.http.post<any>(`${this.ADMIN_API_URL}/session-store`, survey);
  }
  confirmAdminSubmit(isPublish: boolean): Observable<any> {
    return this.http.post<any>(
      `${this.ADMIN_API_URL}/confirm-commit?isPublish=${isPublish}`,
      {},
    );
  }
  // === 基本 CRUD ===
  saveSurvey(survey: Survey): Observable<Survey> {
    const request = survey.id
      ? this.http.put<any>(`${this.ADMIN_API_URL}/${survey.id}`, survey)
      : this.http.post<any>(this.ADMIN_API_URL, survey);
    return request.pipe(map((res) => res.data));
  }
  deleteSurvey(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.ADMIN_API_URL}/${id}`)
      .pipe(map((res) => res.data));
  }
}
