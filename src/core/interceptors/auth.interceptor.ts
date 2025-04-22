import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/utility/storage.service';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpResponse } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('Interceptando petición:', req.url);

  // Obtener el token (así es como deberías hacerlo)
  const token = localStorage.getItem('token');

  // Añadir el token de autorización si existe
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        console.log('Respuesta recibida:', event);
        // No manipular la respuesta aquí, solo registrarla
      }
    }),
    catchError(error => {
      console.error('Error en la petición:', error);
      return throwError(() => error);
    })
  );
};
