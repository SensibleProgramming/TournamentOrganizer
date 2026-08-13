import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { offlineRedirectGuard } from './offline-redirect.guard';
import { AuthService } from '../services/auth.service';
import { NetworkStatusService } from '../services/network-status.service';

describe('offlineRedirectGuard', () => {
  let authReadySubject: BehaviorSubject<boolean>;
  let mockAuth: { authReady$: Observable<boolean> };
  let mockNetwork: { degraded: boolean };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(() => {
    authReadySubject = new BehaviorSubject<boolean>(false);
    mockAuth = { authReady$: authReadySubject.asObservable() };
    mockNetwork = { degraded: false };
    mockRouter = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: NetworkStatusService, useValue: mockNetwork },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  function runGuard(): Observable<boolean> {
    return TestBed.runInInjectionContext(() =>
      offlineRedirectGuard({} as any, {} as any)
    ) as Observable<boolean>;
  }

  it('does not decide while authReady$ is still false', () => {
    let emitted = false;
    runGuard().subscribe(() => { emitted = true; });
    expect(emitted).toBe(false);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('allows activation once ready and backend is reachable', async () => {
    const promise = firstValueFrom(runGuard());
    authReadySubject.next(true);
    const result = await promise;
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /events once ready and backend is degraded', async () => {
    mockNetwork.degraded = true;
    const promise = firstValueFrom(runGuard());
    authReadySubject.next(true);
    const result = await promise;
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/events']);
  });

  it('decides immediately when authReady$ is already true (subsequent navigations)', async () => {
    authReadySubject.next(true);
    const result = await firstValueFrom(runGuard());
    expect(result).toBe(true);
  });
});
