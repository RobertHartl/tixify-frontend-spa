import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);

  isLoading = signal(true);
  events = signal<any[]>([]);

  totalEvents = computed(() => this.events().length);

  totalStock = computed(() => 
    this.events().reduce((sum, e) => sum + (Number(e.event_stock ?? e.stock) || 0), 0)
  );

  totalInventoryValue = computed(() => 
    this.events().reduce((sum, e) => {
      const stock = Number(e.event_stock ?? e.stock) || 0;
      const price = parseFloat(e.price) || 0;
      return sum + (stock * price);
    }, 0)
  );

  avgTicketPrice = computed(() => {
    if (this.totalEvents() === 0) return 0;
    const sumPrice = this.events().reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0);
    return sumPrice / this.totalEvents();
  });

  lowStockEvents = computed(() => 
    this.events().filter(e => (Number(e.event_stock ?? e.stock) || 0) < 50)
  );

  categoryDistribution = computed(() => {
    const counts: Record<string, number> = {};
    for (const e of this.events()) {
      const cat = e.category || 'Sonstige';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / (this.totalEvents() || 1)) * 100)
    }));
  });

  ngOnInit(): void {
    this.api.getEvents().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res.events || res.data || []);
        this.events.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Fehler beim Laden des Dashboards:', err);
        this.isLoading.set(false);
      }
    });
  }
}