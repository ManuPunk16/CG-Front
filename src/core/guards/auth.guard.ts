import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/api/auth.service';
import { StorageService } from '../services/utility/storage.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const storageService = inject(StorageService);

  // Verificación redundante para máxima seguridad
  const token = storageService.getItem('token');
  const isAuth = authService.isAuthenticated();

  console.log('AuthGuard - Token exists:', !!token);
  console.log('AuthGuard - isAuthenticated:', isAuth);

  if (token && !isAuth) {
    // Inconsistencia: hay token pero no está autenticado según el servicio
    console.log('Inconsistencia detectada - Forzando recarga del estado de autenticación');
    // Forzar recarga del estado desde el storage
    authService.reloadAuthState();

    // Verificar de nuevo
    if (authService.isAuthenticated()) {
      return true;
    }
  } else if (isAuth) {
    return true;
  }

  // Guardar la URL a la que intentaba acceder para redirigir después del login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
