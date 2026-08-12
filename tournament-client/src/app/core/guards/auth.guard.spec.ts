import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authReadySubject: BehaviorSubject<boolean>;
  let mockAuth: { authReady$: Observable<boolean>; getToken: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(() => {
    authReadySubject = new BehaviorSubject<boolean>(false);
    mockAuth = { authReady$: authReadySubject.asObservable(), getToken: jest.fn() };
    mockRouter = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  function runGuard(): Observable<boolean> {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/events/1' } as any)
    ) as Observable<boolean>;
  }

  it('does not decide while authReady$ is still false', () => {
    mockAuth.getToken.mockReturnValue('valid-token');
    let emitted = false;
    runGuard().subscribe(() => { emitted = true; });
    expect(emitted).toBe(false);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('allows navigation once ready and a token exists', async () => {
    mockAuth.getToken.mockReturnValue('valid-token');
    const promise = firstValueFrom(runGuard());
    authReadySubject.next(true);
    const result = await promise;
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /login with returnUrl once ready and no token', async () => {
    mockAuth.getToken.mockReturnValue(null);
    const promise = firstValueFrom(runGuard());
    authReadySubject.next(true);
    const result = await promise;
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/events/1' } });
  });

  it('decides immediately when authReady$ is already true (subsequent navigations)', async () => {
    authReadySubject.next(true);
    mockAuth.getToken.mockReturnValue('valid-token');
    const result = await firstValueFrom(runGuard());
    expect(result).toBe(true);
  });
});
