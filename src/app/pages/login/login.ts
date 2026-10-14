import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.post<any>('https://tixify-c7a903638236.herokuapp.com/api/auth/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const token = res.token;
        const user = res.user || { email: this.email, role: res.role || 'admin', name: res.name || this.email };

        this.auth.setSession(token, user);

        if (this.auth.isAdminOrOrganizer()) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Zugriff verweigert: Nur Admins oder Veranstalter haben Zugriff auf das Admin-Panel.');
          this.auth.logout();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || err.error?.message || 'Login fehlgeschlagen. Bitte Zugangsdaten prüfen.');
      }
    });
  }
}