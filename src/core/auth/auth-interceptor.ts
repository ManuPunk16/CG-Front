import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from './authstate.service';
import { Router } from '@angular/router';

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authStateService = inject(AuthStateService);
  const router = inject(Router);

  const token = sessionStorage.getItem('auth-token');
  if (token) {
    req = req.clone({
      setHeaders: {
        'x-access-token': token
      }
    });
  }

  return next(req).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401) {
      authStateService.logout();
      router.navigate(['/login']);
    }
    return throwError(() => error);
  }));
};
