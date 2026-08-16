import { Component } from '@angular/core';

/**
 * 全站動畫漸層背景。
 *
 * 刻意用純 CSS 而非 WebGL shader：demo 用投影機，投影的模糊與低對比會吃掉
 * shader noise 的細節優勢，而 WebGL 在 demo 機（LG Gram，整合顯卡、
 * 同時跑 JVM 後端 + 瀏覽器）上有發熱降頻的風險。
 *
 * 效能設計：blur 是靜態的、只有 transform 在動。瀏覽器會把模糊後的結果
 * rasterize 成 texture 再做合成位移，因此 blur 只算一次，不是每幀重算。
 * 動畫刻意只用 translate3d（純合成操作），不用 scale，避免 texture 重新取樣。
 */
@Component({
  selector: 'app-aurora-background',
  template: `
    <div class="aurora" aria-hidden="true">
      <span class="aurora__blob aurora__blob--1"></span>
      <span class="aurora__blob aurora__blob--2"></span>
      <span class="aurora__blob aurora__blob--3"></span>
      <span class="aurora__veil"></span>
    </div>
  `,
  styles: `
    .aurora {
      position: fixed;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    }

    /* 中央柔化遮罩：內容區後方壓淡，色彩退到畫面邊緣。
       沒有這層的話，內容少的頁面下半部會裸露大片飽和色塊、構圖鬆散，
       而且卡片必須做得更不透明才讀得到字。 */
    .aurora__veil {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 72% 58% at 50% 40%,
          var(--veil-color) 0%,
          transparent 100%);
    }

    .aurora__blob {
      position: absolute;
      border-radius: 50%;
      opacity: var(--grad-opacity);
      /* 純色 + blur 比 radial-gradient + blur 便宜（不需要漸層取樣） */
      filter: blur(80px);
      will-change: transform;
    }

    /* 色塊刻意做大：投影機上小色塊會被模糊吃掉，只有大面積色域傳得過去 */
    .aurora__blob--1 {
      width: 52vw;
      height: 52vw;
      top: -14vh;
      left: -8vw;
      background: var(--grad-1);
      animation: aurora-drift-1 34s ease-in-out infinite;
    }

    .aurora__blob--2 {
      width: 44vw;
      height: 44vw;
      top: 26vh;
      right: -10vw;
      background: var(--grad-2);
      animation: aurora-drift-2 41s ease-in-out infinite;
    }

    .aurora__blob--3 {
      width: 40vw;
      height: 40vw;
      bottom: -16vh;
      left: 24vw;
      background: var(--grad-3);
      animation: aurora-drift-3 29s ease-in-out infinite;
    }

    /* 三個週期刻意互質（34/41/29 秒），避免同時回到原點而讓循環被看出來 */
    @keyframes aurora-drift-1 {
      0%,
      100% {
        transform: translate3d(0, 0, 0);
      }
      50% {
        transform: translate3d(9vw, 7vh, 0);
      }
    }

    @keyframes aurora-drift-2 {
      0%,
      100% {
        transform: translate3d(0, 0, 0);
      }
      50% {
        transform: translate3d(-11vw, -8vh, 0);
      }
    }

    @keyframes aurora-drift-3 {
      0%,
      100% {
        transform: translate3d(0, 0, 0);
      }
      50% {
        transform: translate3d(7vw, -6vh, 0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .aurora__blob {
        animation: none;
      }
    }
  `,
})
export class AuroraBackgroundComponent {}
