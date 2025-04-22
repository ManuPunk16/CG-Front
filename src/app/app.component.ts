import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  effect
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgIf, NgClass } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

// Nuevos servicios
import { AuthService } from '../core/services/api/auth.service';
import { AuthStateService } from '../core/services/utility/auth-state.service';
import { InactivityService } from '../core/services/utility/inactivity.service';
import { PermissionsService } from '../core/services/utility/permissions.service';
import { AlertService } from '../core/services/ui/alert.service';
// import { LoadingSpinnerComponent } from '../core/components/loading-spinner/loading-spinner.component';
import { User } from '../core/models/user/user.model';
import { RolesEnum } from '../core/models/enums/roles.enum';
import { MatMenuModule } from '@angular/material/menu';

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
    NgIf,
    NgClass,
    MatMenuModule
    // LoadingSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  // Inyección de servicios
  private authService = inject(AuthService);
  private authStateService = inject(AuthStateService);
  private permissionsService = inject(PermissionsService);
  private router = inject(Router);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private media = inject(MediaMatcher);
  private inactivityService = inject(InactivityService);
  private alertService = inject(AlertService);

  // Propiedades de la aplicación
  title = 'Control de Gestión';
  currentUser = signal<User | null>(null);
  isAdmin = signal<boolean>(false);
  isDirectorGeneral = signal<boolean>(false);
  isDirector = signal<boolean>(false);

  // Media query para responsive
  mobileQuery: MediaQueryList;
  private readonly mobileQueryListener: () => void;

  // Gestión de sesión
  private readonly sessionTimeoutSeconds = 3600; // 1 hora
  sessionTimeLeft = signal<number>(this.sessionTimeoutSeconds);
  private sessionTimerSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor() {
    // Configuración del media query para diseño responsive
    this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();
    this.mobileQuery.addEventListener('change', this.mobileQueryListener);
  }

  ngOnInit(): void {
    // Suscripción al estado de autenticación usando el observable
    this.authSubscription = this.authStateService.currentUser$.subscribe(user => {
      this.currentUser.set(user);

      if (user) {
        // Configurar permisos basados en el rol
        this.isAdmin.set(user.roles === RolesEnum.ADMIN);
        this.isDirectorGeneral.set(user.roles === RolesEnum.DIRECTOR_GENERAL);
        this.isDirector.set(user.roles === RolesEnum.DIRECTOR);

        // Iniciar timer de sesión
        this.startSessionTimer();
      } else {
        this.stopSessionTimer();
        this.resetUserState();
      }

      this.changeDetectorRef.detectChanges();
    });

    // Iniciar monitoreo de inactividad
    this.configureInactivityMonitoring();
  }

  ngOnDestroy(): void {
    // Limpieza de recursos
    this.mobileQuery.removeEventListener('change', this.mobileQueryListener);
    this.authSubscription?.unsubscribe();
    this.stopSessionTimer();
    this.inactivityService.stopWatching();
  }

  /**
   * Inicia el temporizador de sesión
   */
  private startSessionTimer(): void {
    this.stopSessionTimer(); // Asegurar que no haya timers activos

    this.sessionTimeLeft.set(this.sessionTimeoutSeconds);
    this.sessionTimerSubscription = interval(1000)
      .pipe(take(this.sessionTimeoutSeconds))
      .subscribe({
        next: () => {
          const currentValue = this.sessionTimeLeft();
          this.sessionTimeLeft.set(currentValue - 1);

          // Mostrar advertencia cuando queden 5 minutos
          if (currentValue === 300) {
            this.alertService.warning('Su sesión expirará en 5 minutos por inactividad.');
          }

          // Cerrar sesión cuando el tiempo llegue a cero
          if (currentValue <= 1) {
            this.alertService.info('Su sesión ha expirado por inactividad.');
            this.logout();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: (err) => console.error('Error en el temporizador de sesión:', err)
      });
  }

  /**
   * Detiene el temporizador de sesión
   */
  private stopSessionTimer(): void {
    if (this.sessionTimerSubscription) {
      this.sessionTimerSubscription.unsubscribe();
      this.sessionTimerSubscription = undefined;
    }
  }

  /**
   * Reinicia el estado del usuario
   */
  private resetUserState(): void {
    this.isAdmin.set(false);
    this.isDirectorGeneral.set(false);
    this.isDirector.set(false);
  }

  /**
   * Configura el monitoreo de inactividad
   */
  private configureInactivityMonitoring(): void {
    // Reiniciar el temporizador cuando hay actividad del usuario
    this.inactivityService.onActivity().subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.startSessionTimer();
      }
    });

    // Iniciar monitoreo de inactividad
    this.inactivityService.startWatching();
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        // Incluso si hay error, navegar al login
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    return this.permissionsService.hasPermission(permission);
  }

  /**
   * Formatea el tiempo restante de sesión en formato mm:ss
   */
  formatSessionTime(): string {
    const minutes = Math.floor(this.sessionTimeLeft() / 60);
    const seconds = this.sessionTimeLeft() % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
