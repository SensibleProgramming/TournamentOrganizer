import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Session-level (in-memory, non-persisted) signal for whether the backend
 * API is currently reachable. Driven by networkStatusInterceptor observing
 * every /api/** response — not navigator.onLine, which can't detect a
 * reachable browser network with no deployed backend behind it.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private degradedSubject = new BehaviorSubject<boolean>(false);
  degraded$ = this.degradedSubject.asObservable();

  get degraded(): boolean {
    return this.degradedSubject.value;
  }

  reportUnreachable(): void {
    if (!this.degraded) this.degradedSubject.next(true);
  }

  reportReachable(): void {
    if (this.degraded) this.degradedSubject.next(false);
  }
}
