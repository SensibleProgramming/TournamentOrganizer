import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NetworkStatusService] });
    service = TestBed.inject(NetworkStatusService);
  });

  it('starts not degraded', () => {
    expect(service.degraded).toBe(false);
  });

  it('reportUnreachable() sets degraded true and emits once', () => {
    const emissions: boolean[] = [];
    service.degraded$.subscribe((v) => emissions.push(v));

    service.reportUnreachable();
    service.reportUnreachable();

    expect(service.degraded).toBe(true);
    expect(emissions).toEqual([false, true]);
  });

  it('reportReachable() sets degraded false', () => {
    service.reportUnreachable();

    service.reportReachable();

    expect(service.degraded).toBe(false);
  });

  it('reportReachable() is a no-op when already reachable (no duplicate emit)', () => {
    const emissions: boolean[] = [];
    service.degraded$.subscribe((v) => emissions.push(v));

    service.reportReachable();

    expect(emissions).toEqual([false]);
  });
});
