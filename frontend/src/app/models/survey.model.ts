export type SurveyStatus = 'DRAFT' | 'PUBLISHED';
export type TimeStatus = 'NOT_STARTED' | 'ONGOING' | 'ENDED';
export type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT';
export interface Option {
  id?: number;
  optionText: string;
  orderIndex: number;
}
export interface Question {
  id?: number;
  title: string;
  type: QuestionType;
  required: boolean;
  orderIndex: number;
  options: Option[];
}
export interface Survey {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: SurveyStatus;
  hasResponses?: boolean;
  questions: Question[];
}
// 依 startDate/endDate 算出時間狀態，只在已發佈時有意義；純前端計算，不佔後端 DTO 欄位
export function getTimeStatus(s: Survey): TimeStatus | null {
  if (s.status !== 'PUBLISHED') return null;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (today < s.startDate) return 'NOT_STARTED';
  if (today > s.endDate) return 'ENDED';
  return 'ONGOING';
}
