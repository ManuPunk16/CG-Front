import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '../auth/token-storage.service';
import { fromEvent, merge, Observable, Subscription } from 'rxjs';
import { tap, throttleTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {

  private inactivityTimeout: number = 30 * 60 * 1000; // 30 minutos
  private warningTimeout: number = 5 * 60 * 1000; // 5 minutos antes del cierre de sesión
  private timerSubscription: Subscription | undefined;
  private warningTimer: any;

  constructor(
    private tokenStorageService: TokenStorageService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  startWatching(): void {
    this.ngZone.runOutsideAngular(() => {
      const events: Observable<any> = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'mousedown'),
        fromEvent(document, 'keypress'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'click')
      );

      this.timerSubscription = events.pipe(
        throttleTime(500)
      ).subscribe(() => {
        this.resetTimer();
      });

      this.resetTimer();
    });
  }

  stopWatching(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    clearTimeout(this.warningTimer);
  }

  private resetTimer(): void {
    clearTimeout(this.warningTimer);
    this.warningTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.showInactivityWarning();
      });
    }, this.inactivityTimeout - this.warningTimeout);
  }

  private showInactivityWarning(): void {
    // Muestra una advertencia al usuario
    Swal.fire({
      title: '¿Sigues ahí?',
      text: 'Tu sesión está a punto de caducar por inactividad.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, seguir conectado',
      cancelButtonText: 'Cerrar sesión'
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetTimer();
      } else {
        this.logout();
      }
    });
  }

  private logout(): void {
    this.tokenStorageService.signOut();
    this.router.navigate(['/login']);
  }
}
