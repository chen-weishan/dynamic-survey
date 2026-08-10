import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map } from 'rxjs';
import { User, AuthResponse } from '../models/auth.model';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = 'http://localhost:8080/api/auth';

  currentUser = signal<User | null>(null); // 用 Signal 管理登入狀態

  constructor() {
    const token = localStorage.getItem('token');
    if (token) {
      this.fetchUserProfile().subscribe({
        error: () => localStorage.removeItem('token'),
      });
    }
  }

  login(credentials: any) {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap((res) => {
          if (res.code === 200 && res.data.token)
            this.handleAuthSuccess(res.data.token);
        }),
      );
  }

  register(userData: any) {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap((res) => {
          if (res.code === 200 && res.data.token)
            this.handleAuthSuccess(res.data.token);
        }),
      );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(token: string) {
    localStorage.setItem('token', token);
    this.fetchUserProfile().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      },
    });
  }

  fetchUserProfile() {
    // 加時間戳避免瀏覽器快取舊的 401 結果
    return this.http
      .get<any>(`http://localhost:8080/api/users/profile?t=${Date.now()}`)
      .pipe(
        map((res) => {
          if (res.code !== 200)
            throw new Error(res.message || '無法取得使用者資料');
          return res.data as User;
        }),
        tap((user) => this.currentUser.set(user)),
      );
  }
}
