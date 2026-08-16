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
export type SurveySortKey = 'id' | 'title' | 'status' | 'period';
export type SortDir = 'asc' | 'desc';

/**
 * 列表排序。問卷查詢與問卷管理兩頁共用，排序規則才不會兩邊各寫一套、行為不一致。
 *
 * 狀態欄刻意不照字典序：使用者心裡的順序是時間軸
 * （草稿 → 尚未開始 → 進行中 → 已結束），照字串排會變成「已結束、尚未開始、進行中」。
 */
const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  NOT_STARTED: 1,
  ONGOING: 2,
  ENDED: 3,
};

export function sortSurveys(
  list: Survey[],
  key: SurveySortKey | null,
  dir: SortDir,
): Survey[] {
  if (!key) return list;
  const sign = dir === 'asc' ? 1 : -1;

  return [...list].sort((a, b) => {
    let diff = 0;
    switch (key) {
      case 'id':
        diff = (a.id ?? 0) - (b.id ?? 0);
        break;
      case 'title':
        // 中文要用 localeCompare 才會照筆劃/注音排，直接比字串是比 UTF-16 碼位
        diff = a.title.localeCompare(b.title, 'zh-Hant');
        break;
      case 'status':
        diff =
          STATUS_ORDER[a.status === 'DRAFT' ? 'DRAFT' : getTimeStatus(a)!] -
          STATUS_ORDER[b.status === 'DRAFT' ? 'DRAFT' : getTimeStatus(b)!];
        break;
      case 'period':
        // 開放期間先比開始日，同一天再比結束日（短的排前面）
        diff =
          a.startDate.localeCompare(b.startDate) ||
          a.endDate.localeCompare(b.endDate);
        break;
    }
    // 同值時用 id 收尾，避免每次排序的相對位置飄移
    return sign * (diff || (a.id ?? 0) - (b.id ?? 0));
  });
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
