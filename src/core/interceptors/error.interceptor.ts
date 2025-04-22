import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AlertService } from '../services/ui/alert.service';
import { AuthService } from '../services/api/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const alertService = inject(AlertService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Sesión expirada o no autenticado
        return authService.logout().pipe(
          switchMap(() => {
            router.navigate(['/auth/login']);
            return throwError(() => new Error('Sesión expirada. Por favor inicie sesión nuevamente.'));
          })
        );
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
