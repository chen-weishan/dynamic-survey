import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, MatToolbarModule, MatButtonModule,
            MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html', styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  authService = inject(AuthService);          // 讀取登入狀態 Signal
  logout() { this.authService.logout(); }
}
