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
import { Subject, Subscription, interval } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

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
import { MatCardModule } from '@angular/material/card';

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
    // NgClass,
    MatMenuModule,
    MatCardModule
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

  currentYear: number = new Date().getFullYear();

  // Media query para responsive
  mobileQuery: MediaQueryList;
  private readonly mobileQueryListener: () => void;

  // Gestión de sesión
  private readonly sessionTimeoutSeconds = 3600; // 1 hora
  sessionTimeLeft = signal<number>(this.sessionTimeoutSeconds);
  private sessionTimerSubscription?: Subscription;
  private authSubscription?: Subscription;
  private destroy$ = new Subject<void>();

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

        // Detener cualquier temporizador activo
        this.stopSessionTimer();

        // Iniciar un nuevo temporizador
        this.startSessionTimer();

        // Configurar monitoreo de inactividad si no está configurado
        this.configureInactivityMonitoring();

        console.log('Usuario autenticado, temporizador de sesión iniciado');
      } else {
        // Detener temporizadores cuando no hay usuario
        this.stopSessionTimer();
        this.inactivityService.stopWatching();
        this.resetUserState();
      }

      this.changeDetectorRef.detectChanges();
    });

    // Actualizar la configuración de media queries para diseño responsivo
    this.mobileQuery = this.media.matchMedia('(max-width: 768px)');
    this.mobileQuery.addEventListener('change', this.mobileQueryListener);

    // Verificar si hay una sesión guardada y recargarla
    this.authService.reloadAuthState();
  }

  ngOnDestroy(): void {
    // Limpieza de recursos
    this.mobileQuery.removeEventListener('change', this.mobileQueryListener);
    this.authSubscription?.unsubscribe();
    this.stopSessionTimer();
    this.inactivityService.stopWatching();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicia el temporizador de sesión
   */
  private startSessionTimer(): void {
    this.stopSessionTimer(); // Asegurar que no haya timers activos

    console.log('Iniciando temporizador de sesión por', this.sessionTimeoutSeconds, 'segundos');

    this.sessionTimeLeft.set(this.sessionTimeoutSeconds);
    this.sessionTimerSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
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
    this.inactivityService.onActivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.authService.isAuthenticated()) {
          console.log('Actividad detectada, reiniciando temporizador de sesión');
          this.stopSessionTimer(); // Detener el temporizador actual
          this.startSessionTimer(); // Iniciar uno nuevo
          this.changeDetectorRef.detectChanges();
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
