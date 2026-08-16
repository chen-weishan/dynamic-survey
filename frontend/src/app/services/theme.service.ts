import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'dynamic-survey-theme';

/** View Transitions API 尚未進入 TypeScript 的 lib.dom，這裡只宣告用到的部分。 */
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>('light');

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    this.apply(this.readStored(), false);
  }

  /**
   * 刻意「不」讀系統的 prefers-color-scheme：
   * demo 用投影機，投影在明亮環境下必須從淺色開場才有對比，
   * 不能讓開發機或現場電腦的系統設定決定第一眼看到什麼。
   */
  private readStored(): ThemeMode {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      // 無痕模式下 localStorage 會拋錯，直接回預設值
      return 'light';
    }
  }

  /**
   * 同步套用。不用 effect 是因為 signal 的 effect 是非同步 flush，
   * 而 startViewTransition 的 callback 要求 DOM 變更在同一個 tick 內完成，
   * 否則會截到舊畫面、動畫變成沒有變化。
   */
  private apply(mode: ThemeMode, persist = true): void {
    this._mode.set(mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // 無痕模式，忽略
      }
    }
  }

  /**
   * 從 origin 座標擴散的圓形揭露切換。
   * origin 通常傳觸發按鈕的中心點，讓新配色像水波一樣從按鈕擴散出來。
   * 不支援 View Transitions 或使用者要求減少動態時，退回直接切換。
   */
  async toggle(origin?: { x: number; y: number }): Promise<void> {
    const next: ThemeMode = this._mode() === 'dark' ? 'light' : 'dark';
    const doc = document as DocumentWithViewTransition;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!doc.startViewTransition || prefersReduced) {
      this.apply(next);
      return;
    }

    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;

    // 半徑取到最遠的角落，否則圓形還沒蓋滿畫面動畫就結束，
    // 剩下的區域會在那一刻瞬間跳成新配色。
    //
    // 高度不能只用 innerHeight：頁面可滾動時 root 的快照高度會大於 viewport，
    // 用 innerHeight 算出來的半徑偏小，症狀就是「擴散到底部附近就突然結束」。
    // 再乘 1.12 當安全邊際 —— 超出畫面的部分反正看不到，寧可多擴散一點。
    const effectiveHeight = Math.max(
      window.innerHeight,
      document.documentElement.scrollHeight,
    );
    const radius =
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, effectiveHeight - y),
      ) * 1.12;

    const transition = doc.startViewTransition(() => this.apply(next));
    await transition.ready;

    // easing 刻意用 linear：cubic-bezier(0.22,1,0.36,1) 是 ease-out 曲線，
    // 尾段速度趨近於零，圓形擴散到接近全螢幕時會明顯「拖」一下才收尾。
    // 等速擴散反而俐落，而且更像水波推過畫面。
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 420,
        easing: 'linear',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }
}
