import { Component, DestroyRef, NgZone, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  authService = inject(AuthService);

  /** scroll 超過門檻後收縮成浮起的圓角膠囊 */
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);

  constructor() {
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);

    // 刻意在 Angular zone 外面監聽 scroll，只有「狀態真的翻轉」時才進 zone。
    // 用 @HostListener('window:scroll') 的話每一次滾動事件都會觸發整個 app 的
    // 變更偵測 —— 在 demo 機（LG Gram、整合顯卡）上那是白花的成本，
    // 而且會讓 template 裡呼叫方法的元件（例如統計頁的圖表）反覆重算。
    zone.runOutsideAngular(() => {
      const onScroll = () => {
        const next = window.scrollY > 10;
        if (next !== this.scrolled()) {
          zone.run(() => this.scrolled.set(next));
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
      });
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.lockBodyScroll(this.menuOpen());
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.lockBodyScroll(false);
  }

  logout(): void {
    this.authService.logout();
  }

  /** 手機選單展開時鎖住背景滾動，否則選單後面的頁面還能捲動 */
  private lockBodyScroll(lock: boolean): void {
    document.body.style.overflow = lock ? 'hidden' : '';
  }
}
