import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { networkStatusInterceptor } from './network-status.interceptor';
import { NetworkStatusService } from '../services/network-status.service';

describe('networkStatusInterceptor', () => {
  let netStatus: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NetworkStatusService] });
    netStatus = TestBed.inject(NetworkStatusService);
  });

  function run(req: HttpRequest<unknown>, next: (r: HttpRequest<unknown>) => any) {
    return TestBed.runInInjectionContext(() => networkStatusInterceptor(req, next));
  }

  it('passes through non-/api/** requests untouched, without touching NetworkStatusService', async () => {
    const req = new HttpRequest('GET', '/assets/logo.png');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(run(req, next));

    expect(next).toHaveBeenCalledWith(req);
    expect(netStatus.degraded).toBe(false);
  });

  it('reports reachable on a successful /api/** response', async () => {
    netStatus.reportUnreachable();
    const req = new HttpRequest('GET', '/api/events');
    const next = jest.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    await firstValueFrom(run(req, next));

    expect(netStatus.degraded).toBe(false);
  });

  it('reports unreachable and rethrows on a 404 /api/** response', async () => {
    const req = new HttpRequest('GET', '/api/events');
    const err = new HttpErrorResponse({ status: 404 });
    const next = jest.fn().mockReturnValue(throwError(() => err));

    await expect(firstValueFrom(run(req, next))).rejects.toBe(err);
    expect(netStatus.degraded).toBe(true);
  });

  it('does NOT report unreachable on a real 401 /api/** error, but still rethrows', async () => {
    const req = new HttpRequest('GET', '/api/events');
    const err = new HttpErrorResponse({ status: 401 });
    const next = jest.fn().mockReturnValue(throwError(() => err));

    await expect(firstValueFrom(run(req, next))).rejects.toBe(err);
    expect(netStatus.degraded).toBe(false);
  });
});
