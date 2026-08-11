import { Component, HostListener, inject, signal } from '@angular/core';
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

  @HostListener('window:scroll')
  onScroll(): void {
    // signal 設成相同值不會觸發變更偵測，所以這裡不需要自己節流
    this.scrolled.set(window.scrollY > 10);
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
