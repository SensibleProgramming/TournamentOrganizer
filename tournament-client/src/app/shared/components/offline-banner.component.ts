import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { NetworkStatusService } from '../../core/services/network-status.service';

@Component({
  selector: 'app-offline-banner',
  imports: [MatIconModule],
  template: `
    @if (degraded) {
      <div class="offline-banner" role="status">
        <mat-icon>cloud_off</mat-icon>
        <span>Backend unreachable — showing cached data. Some features are unavailable.</span>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: #b71c1c;
      color: white;
      font-size: 14px;
    }
    .offline-banner span { flex: 1; }
  `]
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  degraded = false;
  private sub!: Subscription;

  constructor(private netStatus: NetworkStatusService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.sub = this.netStatus.degraded$.subscribe((degraded) => {
      this.degraded = degraded;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
