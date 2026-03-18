import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PlayerService } from '../../core/services/player.service';
import { LeaderboardEntry } from '../../core/models/api.models';
import { RatingBadgeComponent } from '../../shared/components/rating-badge.component';

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule, RouterLink, MatTableModule, MatCardModule, MatIconModule, RatingBadgeComponent],
  template: `
    <h2>Global Leaderboard</h2>
    <mat-card>
      <mat-card-content>
        @if (leaderboard.length === 0) {
          <p>No ranked players yet. Players need 5 games to appear here.</p>
        } @else {
          <table mat-table [dataSource]="leaderboard" class="full-width">
            <ng-container matColumnDef="rank">
              <th mat-header-cell *matHeaderCellDef>#</th>
              <td mat-cell *matCellDef="let row">{{ row.rank }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Player</th>
              <td mat-cell *matCellDef="let row">
                @if (avatarUrl(row)) {
                  <img [src]="avatarUrl(row)!" class="avatar-thumb" [alt]="row.name" />
                } @else {
                  <mat-icon class="avatar-thumb-icon">person</mat-icon>
                }
                <a [routerLink]="['/players', row.playerId]">{{ row.name }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Rating</th>
              <td mat-cell *matCellDef="let row">
                <app-rating-badge [score]="row.conservativeScore"></app-rating-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="mu">
              <th mat-header-cell *matHeaderCellDef>Mu</th>
              <td mat-cell *matCellDef="let row">{{ row.mu | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="sigma">
              <th mat-header-cell *matHeaderCellDef>Sigma</th>
              <td mat-cell *matCellDef="let row">{{ row.sigma | number:'1.2-2' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .avatar-thumb      { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; vertical-align: middle; margin-right: 8px; }
    .avatar-thumb-icon { font-size: 32px; width: 32px; height: 32px; vertical-align: middle; margin-right: 8px; }
  `]
})
export class LeaderboardComponent implements OnInit {
  leaderboard: LeaderboardEntry[] = [];
  readonly columns = ['rank', 'name', 'score', 'mu', 'sigma'];
  private readonly sessionTs = Date.now();

  avatarUrl(row: LeaderboardEntry): string | null {
    const url = (row as any).avatarUrl as string | null | undefined;
    if (!url) return null;
    return url.includes('?t=') ? url : `${url}?t=${this.sessionTs}`;
  }

  constructor(private playerService: PlayerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.playerService.leaderboard$.subscribe(data => {
      this.leaderboard = data;
      this.cdr.detectChanges();
    });
    this.playerService.loadLeaderboard();
  }
}
