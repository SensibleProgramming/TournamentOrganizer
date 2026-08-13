import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { OfflineBannerComponent } from './offline-banner.component';
import { NetworkStatusService } from '../../core/services/network-status.service';

describe('OfflineBannerComponent', () => {
  let degradedSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    degradedSubject = new BehaviorSubject<boolean>(false);
    const mockNetStatus = { degraded$: degradedSubject.asObservable() };

    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
      providers: [{ provide: NetworkStatusService, useValue: mockNetStatus }],
    }).compileComponents();
  });

  it('is hidden while the backend is reachable', () => {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.degraded).toBe(false);
    expect(fixture.nativeElement.querySelector('.offline-banner')).toBeNull();
  });

  it('becomes visible with the offline message when the backend goes unreachable', () => {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();

    degradedSubject.next(true);

    expect(fixture.componentInstance.degraded).toBe(true);
    const banner = fixture.nativeElement.querySelector('.offline-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Backend unreachable');
  });

  it('hides again once the backend becomes reachable', () => {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();
    degradedSubject.next(true);

    degradedSubject.next(false);

    expect(fixture.componentInstance.degraded).toBe(false);
    expect(fixture.nativeElement.querySelector('.offline-banner')).toBeNull();
  });

  it('unsubscribes on destroy', () => {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();
    const sub = (fixture.componentInstance as any).sub;
    const unsubscribeSpy = jest.spyOn(sub, 'unsubscribe');

    fixture.destroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
