import { Injectable, inject } from '@angular/core';
import { AuthService } from '../api/auth.service';
import { RolesEnum } from '../../models/enums/roles.enum';
import { User } from '../../models/user/user.model';
import { AreasEnum, AreasByDireccion } from '../../models/enums/areas.enum';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private authService = inject(AuthService);

  /**
   * Obtiene las áreas permitidas según el rol del usuario
   * @param userRole Rol del usuario
   * @param userArea Área asignada al usuario
   * @returns Array de áreas permitidas o null si tiene acceso a todas
   */
  getAreasByRole(userRole: string, userArea: string): string[] | null {
    // Normalizar el rol para hacer la comparación insensible a mayúsculas/minúsculas
    const normalizedRole = userRole?.toLowerCase();

    // console.log('Evaluando áreas permitidas:', { userRole, normalizedRole, roleEnum: RolesEnum });

    switch (normalizedRole) {
      case RolesEnum.ADMIN.toLowerCase():
        return null; // Acceso total

      case RolesEnum.DIRECTOR_GENERAL.toLowerCase():
      case 'director general': // Añadir esta alternativa para mayor robustez
        // Usar el mapeo oficial de AreasByDireccion de areas.enum.ts
        const areasSubordinadas = AreasByDireccion[userArea] || [];

        console.log('Áreas permitidas para director general:', {
          userArea,
          areasSubordinadas
        });

        // Devolver un conjunto único de áreas (para evitar duplicados)
        return [...new Set([userArea, ...areasSubordinadas])];

      case RolesEnum.DIRECTOR.toLowerCase():
      case RolesEnum.ENLACE.toLowerCase():
        return [userArea];

      default:
        console.warn(`⚠️ Rol no reconocido: "${userRole}". No se asignaron áreas permitidas.`);
        return [];
    }
  }

  /**
   * Valida si un usuario tiene acceso a un área específica
   * @param userRole Rol del usuario
   * @param userArea Área asignada al usuario
   * @param targetArea Área objetivo a validar
   * @returns true si tiene acceso, false en caso contrario
   */
  validateUserAccess(userRole: string, userArea: string, targetArea: string): boolean {
    const allowedAreas = this.getAreasByRole(userRole, userArea);

    // Para administradores
    if (allowedAreas === null) return true;

    // Para otros roles
    return allowedAreas.includes(targetArea);
  }

  /**
   * Verifica si el usuario actual tiene acceso a un área específica
   * @param targetArea Área objetivo a validar
   * @returns true si tiene acceso, false en caso contrario
   */
  currentUserHasAccessTo(targetArea: string): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    return this.validateUserAccess(
      currentUser.roles as string,
      currentUser.area,
      targetArea
    );
  }

  /**
   * Obtiene las áreas a las que el usuario actual tiene acceso
   * @returns Array de áreas permitidas o null si tiene acceso a todas
   */
  getCurrentUserAllowedAreas(): string[] | null {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return [];

    const areas = this.getAreasByRole(currentUser.roles as string, currentUser.area);
    // console.log('getCurrentUserAllowedAreas', {
    //   currentUser: currentUser.username,
    //   role: currentUser.roles,
    //   area: currentUser.area,
    //   result: areas
    // });
    return areas;
  }

  /**
   * Verifica si el usuario tiene permiso para una acción específica
   * @param action Nombre de la acción a verificar
   * @returns true si tiene permiso, false en caso contrario
   */
  hasPermission(action: 'create' | 'edit' | 'delete' | 'export' | string): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const role = user.roles as string;

    switch (action) {
      case 'create':
        // Solo pueden crear registros administradores, directores generales y directores
        return [RolesEnum.ADMIN, RolesEnum.DIRECTOR_GENERAL, RolesEnum.DIRECTOR].includes(role as RolesEnum);

      case 'edit':
        // Todos excepto usuarios de solo lectura pueden editar
        return role !== 'readonly';

      case 'delete':
        // Solo administradores pueden eliminar
        return role === RolesEnum.ADMIN;

      case 'export':
        // Todos pueden exportar
        return true;

      default:
        return false;
    }
  }
}
