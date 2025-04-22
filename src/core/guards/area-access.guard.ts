import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionsService } from '../services/utility/permissions.service';
import { AuthService } from '../services/api/auth.service';

export const areaAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionsService = inject(PermissionsService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar que el usuario esté autenticado
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Obtener área del parámetro si existe
  const paramArea = route.paramMap.get('area');

  // Si la ruta tiene un área específica como parámetro
  if (paramArea) {
    const hasAccess = permissionsService.currentUserHasAccessTo(paramArea);
    if (!hasAccess) {
      router.navigate(['/Entradas']);
      return false;
    }
    return true;
  }

  // Si no hay parámetro área, verificar acceso basado en la ruta actual
  const currentUser = authService.getCurrentUser();
  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar permisos generales basados en el rol del usuario
  // (por ejemplo, para acceder a panel-control solo ciertos roles)
  const path = route.routeConfig?.path || '';

  if (path.includes('panel-control') && !permissionsService.hasPermission('access-panel')) {
    router.navigate(['/Entradas']);
    return false;
  }

  // Por defecto permitir el acceso si el usuario está autenticado
  return true;
};
