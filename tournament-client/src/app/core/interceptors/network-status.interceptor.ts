import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { NetworkStatusService } from '../services/network-status.service';
import { isBackendUnreachable } from '../utils/network-error.util';

export const networkStatusInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) return next(req);

  const netStatus = inject(NetworkStatusService);

  return next(req).pipe(
    tap(() => netStatus.reportReachable()),
    catchError((err: HttpErrorResponse) => {
      if (isBackendUnreachable(err)) netStatus.reportUnreachable();
      return throwError(() => err);
    })
  );
};
