import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthStateService } from './authstate.service';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authStateService = inject(AuthStateService);
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = sessionStorage.getItem('auth-token');
  if (token) {
    req = req.clone({
      headers: req.headers.set('x-access-token', token)
    });
  }

  return next(req).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401) {
      // Intenta refrescar el token
      return authService.refreshToken().pipe(
        switchMap(data => {
          // Guarda el nuevo token
          sessionStorage.setItem('auth-token', data.accessToken);
          // Clona la petición original y la reenvía con el nuevo token
          req = req.clone({
            headers: req.headers.set('x-access-token', data.accessToken)
          });
          return next(req);
        }),
        catchError(() => {
          // Si falla el refresh token, cierra la sesión
          authStateService.logout();
          router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    }
    return throwError(() => error);
  }));
};
