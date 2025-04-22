import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, throwError } from 'rxjs';
import { AlertService } from '../services/ui/alert.service';
import { AuthStateService } from '../services/utility/auth-state.service';

// Control para evitar múltiples redirecciones simultáneas
let isHandlingAuthError = false;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const alertService = inject(AlertService);
  const authStateService = inject(AuthStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Evitar bucles - no procesar si es una petición de logout o si ya estamos manejando un error de auth
        if (req.url.includes('/auth/logout') || isHandlingAuthError) {
          return throwError(() => error);
        }

        // Marcar que estamos manejando un error de autenticación
        isHandlingAuthError = true;

        // Limpiar la sesión localmente sin llamar al backend
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        authStateService.reset();

        // Mostrar mensaje y redireccionar
        setTimeout(() => {
          alertService.warning('Su sesión ha expirado. Por favor inicie sesión nuevamente.');
          router.navigate(['/auth/login'], { queryParams: { expired: 'true' } });

          // Reestablecer el flag después de un tiempo para permitir futuros manejos
          setTimeout(() => {
            isHandlingAuthError = false;
          }, 2000);
        }, 100);

        return of(); // No propagar el error, devuelve un Observable vacío
      }

      if (error.status === 403) {
        alertService.error('No tiene permisos para realizar esta acción');
        router.navigate(['/dashboard']);
      }

      const errorMsg = error.error?.message || 'Se produjo un error en la solicitud';

      // No mostrar alertas para ciertos endpoints (ej. validaciones)
      const isValidationEndpoint = req.url.includes('existe-folio');
      if (!isValidationEndpoint) {
        alertService.error(errorMsg);
      }

      return throwError(() => error);
    })
  );
};
