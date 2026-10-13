import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface CurrentUser {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<CurrentUser | null>(this.getStoredUser());

  constructor(private router: Router) {}

  private getStoredUser(): CurrentUser | null {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    const token = this.getToken();
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        return {
          id: decoded.user_id || decoded.id,
          name: decoded.name || decoded.username || 'Admin',
          email: decoded.email || '',
          role: decoded.role || 'admin'
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setSession(token: string, user: CurrentUser): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    return this.currentUser()?.role?.toLowerCase() || null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isAdminOrOrganizer(): boolean {
    const role = this.getRole();
    return role === 'admin' || role === 'organizer';
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}