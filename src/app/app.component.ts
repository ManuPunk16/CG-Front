
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TokenStorageService } from '../core/auth/token-storage.service';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthStateService } from '../core/auth/authstate.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    NgIf
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  isLoggedIn: boolean = false;
  private authSubscription?: Subscription;

  private roles: string[] = [];
  // isLoggedIn = false;
  showAdminBoard = false;
  showLinkerBoard = false;
  showModeratorBoard = false;
  username?: string;
  public timeLeft: number = 3600;
  public interval?: any;

  mobileQuery!: MediaQueryList;

  private _mobileQueryListener: () => void;

  constructor (
    private tokenStorageService: TokenStorageService,
    private _router: Router,
    private authStateService: AuthStateService
  ) {
    const changeDetectorRef = inject(ChangeDetectorRef);
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.authSubscription = this.authStateService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      if (this.isLoggedIn) {
          const user = this.tokenStorageService.getUser();
          if(user){
              this.roles = user.roles || [];
              this.showAdminBoard = this.roles.includes('ROLE_ADMIN');
              this.showLinkerBoard = this.roles.includes('ROLE_LINKER');
              this.showModeratorBoard = this.roles.includes('ROLE_MODERATOR');
              this.username = user.username;
              this.startTimer();
          }
      } else {
          clearInterval(this.interval);
          this.username = undefined;
          this.roles = [];
          this.showAdminBoard = false;
          this.showLinkerBoard = false;
      }
    });
  }

  startTimer() {
    this.interval = setInterval(() => {
      if(this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.timeLeft = 3600;
        this.logout();
      }
    },1000)
  }

  logout(): void {
    this.authStateService.logout();
    this._router.navigate(['']);
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);

    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
      clearInterval(this.interval);
  }
}
