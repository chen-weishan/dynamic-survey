import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="theme.isDark() ? '切換至淺色模式' : '切換至深色模式'"
      (click)="onToggle($event)"
    >
      <mat-icon [class.is-dark]="theme.isDark()">
        {{ theme.isDark() ? 'light_mode' : 'dark_mode' }}
      </mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    mat-icon {
      transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    mat-icon.is-dark {
      transform: rotate(180deg);
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);

  /** 傳按鈕中心座標，讓新配色從這顆按鈕擴散出去 */
  onToggle(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    void this.theme.toggle({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }
}
