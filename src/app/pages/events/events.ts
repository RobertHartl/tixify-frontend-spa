import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

export interface EventData {
  event_id?: number;
  title: string;
  category?: string;
  location?: string;
  address?: string;
  event_date?: string;
  price: number;
  event_stock: number;
  logo_url?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  newStock?: number;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.css'
})
export class Events implements OnInit {
  private api = inject(ApiService);

  rawEvents = signal<EventData[]>([]);
  isLoading = signal(true);
  statusMessage = signal<string | null>(null);

  searchQuery = signal('');
  sortCol = signal<string>('event_id');
  sortAsc = signal(true);

  currentPage = signal(1);
  readonly rowsPerPage = 8;

  isModalOpen = signal(false);
  modalTitle = signal('Neues Event erstellen');
  addressSuggestions = signal<any[]>([]);
  private searchTimeout: any = null;

  modalForm = signal<EventData>({
    title: '',
    category: 'Konzerte',
    location: '',
    address: '',
    event_date: '',
    price: 0,
    event_stock: 0,
    logo_url: '',
    description: '',
    latitude: null,
    longitude: null
  });

  filteredEvents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const col = this.sortCol();
    const asc = this.sortAsc();

    let list = this.rawEvents().filter(e => {
      if (!query) return true;
      const title = (e.title || '').toLowerCase();
      const loc = (e.location || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const id = String(e.event_id || '');
      return title.includes(query) || loc.includes(query) || cat.includes(query) || id.includes(query);
    });

    return list.sort((a: any, b: any) => {
      let valA = a[col];
      let valB = b[col];

      if (col === 'event_id' || col === 'price' || col === 'event_stock') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (col === 'event_date') {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  });

  totalPages = computed(() => Math.ceil(this.filteredEvents().length / this.rowsPerPage) || 1);

  pagedEvents = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage;
    return this.filteredEvents().slice(start, start + this.rowsPerPage);
  });

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.api.getEventsViaGraphQL().subscribe({
      next: (res: any) => {
        const events = res?.data?.events || res?.events || [];
        const mapped = events.map((e: any) => ({
          ...e,
          newStock: e.event_stock
        }));
        this.rawEvents.set(mapped);
        this.isLoading.set(false);
      },
      error: () => {
        this.api.getEvents().subscribe({
          next: (events: any) => {
            const list = Array.isArray(events) ? events : [];
            this.rawEvents.set(list.map((e: any) => ({ ...e, newStock: e.event_stock })));
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.notify('Fehler beim Laden: ' + err.message);
          }
        });
      }
    });
  }

  changeSort(col: string): void {
    if (this.sortCol() === col) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortCol.set(col);
      this.sortAsc.set(true);
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  updateAddress(val: string): void {
    this.modalForm.update(current => ({
      ...current,
      address: val
    }));

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.onAddressInput(val);
    }, 400);
  }

  onAddressInput(query: string): void {
    if (!query || query.trim().length < 3) {
      this.addressSuggestions.set([]);
      return;
    }

    this.api.searchAddress(query).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.addressSuggestions.set(data);
        } else {
          this.addressSuggestions.set([]);
        }
      },
      error: (err) => {
        console.error('Fehler bei der Adresssuche:', err);
        this.addressSuggestions.set([]);
      }
    });
  }

    selectAddress(item: any): void {
    this.modalForm.update(current => ({
      ...current,
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));
    this.addressSuggestions.set([]);
  }

  openCreateModal(): void {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    this.addressSuggestions.set([]);
    this.modalForm.set({
      title: '',
      category: 'Konzerte',
      location: '',
      address: '',
      event_date: now.toISOString().slice(0, 16),
      price: 0,
      event_stock: 100,
      logo_url: '',
      description: '',
      latitude: null,
      longitude: null
    });
    this.modalTitle.set('Neues Event erstellen');
    this.isModalOpen.set(true);
  }

  openEditModal(event: EventData): void {
    let dateStr = '';
    if (event.event_date) {
      const d = new Date(event.event_date);
      if (!isNaN(d.getTime())) {
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        dateStr = d.toISOString().slice(0, 16);
      }
    }

    this.addressSuggestions.set([]);
    this.modalForm.set({
      ...event,
      logo_url: event.logo_url || '',
      address: event.address || '',
      latitude: event.latitude !== undefined && event.latitude !== null ? Number(event.latitude) : null,
      longitude: event.longitude !== undefined && event.longitude !== null ? Number(event.longitude) : null,
      event_date: dateStr
    });
    this.modalTitle.set(`Event #${event.event_id} bearbeiten`);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.addressSuggestions.set([]);
  }

  saveModalForm(): void {
    const data = this.modalForm();
    if (!data.title) return;

    const payload = {
      ...data,
      latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
      longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null
    };

    if (payload.event_id) {
      this.api.updateEvent(payload.event_id, payload).subscribe({
        next: () => {
          this.notify(`Event #${payload.event_id} erfolgreich aktualisiert!`);
          this.closeModal();
          this.loadEvents();
        },
        error: (err) => this.notify('Fehler beim Speichern: ' + (err.error?.error || err.message))
      });
    } else {
      this.api.createEvent(payload).subscribe({
        next: () => {
          this.notify('Event erfolgreich angelegt!');
          this.closeModal();
          this.loadEvents();
        },
        error: (err) => this.notify('Fehler beim Erstellen: ' + (err.error?.error || err.message))
      });
    }
  }

  deleteEvent(id: number | undefined): void {
    if (!id) return;
    if (confirm(`Möchtest du das Event #${id} wirklich unwiderruflich löschen?`)) {
      this.api.deleteEvent(id).subscribe({
        next: () => {
          this.notify(`Event #${id} gelöscht.`);
          this.loadEvents();
        },
        error: (err) => this.notify('Fehler beim Löschen: ' + (err.error?.error || err.message))
      });
    }
  }

  saveQuickStock(event: EventData): void {
    if (event.newStock === undefined || !event.event_id) return;

    this.api.updateEventStock(event.event_id.toString(), event.newStock).subscribe({
      next: () => {
        event.event_stock = event.newStock!;
        this.notify(`Bestand für "${event.title}" via GraphQL aktualisiert.`);
      },
      error: (err) => this.notify('Mutation fehlgeschlagen: ' + err.message)
    });
  }

  private notify(msg: string): void {
    this.statusMessage.set(msg);
    setTimeout(() => this.statusMessage.set(null), 3500);
  }
}