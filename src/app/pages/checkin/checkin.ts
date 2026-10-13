import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkin.html',
  styleUrl: './checkin.css'
})
export class Checkin {
  private api = inject(ApiService);

  ticketCode = '';
  resultStatus: 'idle' | 'valid' | 'used' | 'invalid' = 'idle';
  statusMessage = '';
  isLoading = false;

  onCheckIn(): void {
    const code = this.ticketCode.trim();
    if (!code) return;

    this.isLoading = true;
    this.resultStatus = 'idle';

    this.api.checkInTicket(code).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.resultStatus = 'valid';
        this.statusMessage = res.message || 'Ticket erfolgreich entwertet!';
        this.ticketCode = '';
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.resultStatus = 'used';
          this.statusMessage = 'Ticket wurde bereits entwertet!';
        } else {
          this.resultStatus = 'invalid';
          this.statusMessage = err.error?.error || 'Ungültiger Ticket-Code.';
        }
      }
    });
  }
}