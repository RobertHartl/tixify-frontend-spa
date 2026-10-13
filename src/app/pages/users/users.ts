import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, UserItem } from '../../services/api';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  private api = inject(ApiService);

  users = signal<UserItem[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  statusMessage = signal<string | null>(null);

  filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    return this.users().filter(u => 
      !q || 
      u.name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) || 
      u.role?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.api.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notify('Fehler beim Laden: ' + (err.error?.error || err.message));
        this.isLoading.set(false);
      }
    });
  }

  onRoleChange(user: UserItem, newRole: string): void {
    this.api.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        user.role = newRole;
        this.notify(`Rolle für ${user.name} auf "${newRole}" geändert.`);
      },
      error: (err) => alert('Fehler beim Ändern der Rolle: ' + (err.error?.error || err.message))
    });
  }

  deleteUser(user: UserItem): void {
    if (confirm(`Möchtest du Benutzer "${user.name}" (${user.email}) wirklich löschen?`)) {
      this.api.deleteUser(user.id).subscribe({
        next: () => {
          this.users.set(this.users().filter(u => u.id !== user.id));
          this.notify(`Benutzer ${user.name} gelöscht.`);
        },
        error: (err) => alert('Löschen fehlgeschlagen: ' + (err.error?.error || err.message))
      });
    }
  }

  private notify(msg: string): void {
    this.statusMessage.set(msg);
    setTimeout(() => this.statusMessage.set(null), 3000);
  }
}
