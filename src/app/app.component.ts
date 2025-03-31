import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TokenStorageService } from '../core/auth/token-storage.service';
import { NgIf } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { AuthStateService } from '../core/auth/authstate.service';
import { InactivityService } from '../core/services/inactivity.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    NgIf
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'ControlGestionFront';
  isLoggedIn = false;
  showAdminBoard = false;
  showLinkerBoard = false;
  showModeratorBoard = false;
  username?: string;
  mobileQuery: MediaQueryList;
  private readonly _mobileQueryListener: () => void;
  private authSubscription?: Subscription;
  private readonly tokenStorageService = inject(TokenStorageService);
  private readonly _router = inject(Router);
  private readonly authStateService = inject(AuthStateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly media = inject(MediaMatcher);
  private readonly inactivityService = inject(InactivityService);
  private readonly sessionTimeoutSeconds = 3600; // Tiempo en segundos (1 hora)
  sessionTimeLeft: number = this.sessionTimeoutSeconds;
  private sessionTimerSubscription?: Subscription;

  constructor() {
    this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => {
      this.changeDetectorRef.detectChanges();
    };
    this.mobileQuery.addEventListener('change', this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.authSubscription = this.authStateService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      if (this.isLoggedIn) {
        const user = this.tokenStorageService.getUser();
        if (user) {
          this.showAdminBoard = user.roles?.includes('ROLE_ADMIN') || false;
          this.showLinkerBoard = user.roles?.includes('ROLE_LINKER') || false;
          this.showModeratorBoard = user.roles?.includes('ROLE_MODERATOR') || false;
          this.username = user.username;
          this.startSessionTimer();
        }
      } else {
        this.stopSessionTimer();
        this.clearSessionData();
      }
      this.changeDetectorRef.detectChanges();
    });
    this.inactivityService.startWatching();
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeEventListener('change', this._mobileQueryListener);
    this.authSubscription?.unsubscribe();
    this.stopSessionTimer();
    this.inactivityService.stopWatching();
  }

  startSessionTimer(): void {
    this.sessionTimeLeft = this.sessionTimeoutSeconds;
    this.sessionTimerSubscription = interval(1000)
      .pipe(take(this.sessionTimeoutSeconds))
      .subscribe(() => {
        this.sessionTimeLeft--;
        if (this.sessionTimeLeft === 0) {
          this.logout();
        }
        this.changeDetectorRef.detectChanges();
      });
  }

  stopSessionTimer(): void {
    this.sessionTimerSubscription?.unsubscribe();
  }

  clearSessionData(): void {
    this.username = undefined;
    this.showAdminBoard = false;
    this.showLinkerBoard = false;
    this.showModeratorBoard = false;
  }

  logout(): void {
    this.authStateService.logout();
    this._router.navigate(['/login']);
  }
}
