import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { NetworkStatusService } from '../services/network-status.service';

/** Keeps Home and Login unreachable while the backend is degraded — there's nothing to fetch or authenticate against. */
export const offlineRedirectGuard: CanActivateFn = () => {
  const auth    = inject(AuthService);
  const network = inject(NetworkStatusService);
  const router  = inject(Router);

  return auth.authReady$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (network.degraded) {
        router.navigate(['/events']);
        return false;
      }
      return true;
    })
  );
};
