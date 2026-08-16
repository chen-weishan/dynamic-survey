import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * 數字滾動進場。
 *
 * 統計頁是 demo 的收尾畫面，數字滾動是投影機上真的看得見的效果之一
 * （數值大幅變化，不像細微位移會被投影模糊吃掉）。
 *
 * 用原生 requestAnimationFrame 而非動畫套件：這裡只需要對單一數值補間，
 * 十幾行就夠，不值得為它背一個依賴。
 */
@Directive({
  selector: '[appCountUp]',
})
export class CountUpDirective {
  readonly appCountUp = input.required<number>();
  readonly countUpSuffix = input('');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame = 0;

  constructor() {
    effect(() => {
      this.run(this.appCountUp(), this.countUpSuffix());
    });
  }

  private run(target: number, suffix: string): void {
    cancelAnimationFrame(this.frame);

    const node = this.el.nativeElement;
    const write = (n: number) => (node.textContent = `${n}${suffix}`);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      write(target);
      return;
    }

    const duration = 900;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic：開頭衝快、收尾穩下來，數字才有「落定」的感覺
      const eased = 1 - Math.pow(1 - progress, 3);
      write(Math.round(target * eased));

      if (progress < 1) {
        this.frame = requestAnimationFrame(step);
      }
    };

    this.frame = requestAnimationFrame(step);
  }
}
