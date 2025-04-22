import { Injectable, inject } from '@angular/core';
import { AuthService } from '../api/auth.service';
import { RolesEnum } from '../../models/enums/roles.enum';
import { User } from '../../models/user/user.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private authService = inject(AuthService);

  /**
   * Mapa de áreas por dirección general
   */
  private readonly AREAS_POR_DIRECCION: Record<string, string[]> = {
    'DIRECCIÓN GENERAL CONSULTIVA': [
      'DIRECCIÓN DE ESTUDIOS JURÍDICOS',
      'DIRECCIÓN DE ESTUDIOS LEGISLATIVOS',
      'DIRECCIÓN DE COMPILACIÓN NORMATIVA, ARCHIVO E IGUALDAD DE GÉNERO'
    ],
    'DIRECCIÓN GENERAL DE LO CONTENCIOSO': [
      'DIRECCIÓN GENERAL DE LO CONTENCIOSO',
      'DIRECCIÓN DE SERVICIOS LEGALES',
      'DIRECCIÓN DE ASISTENCIA TÉCNICA Y COMBATE A LA CORRUPCIÓN',
    ]
  };

  /**
   * Obtiene las áreas permitidas según el rol del usuario
   * @param userRole Rol del usuario
   * @param userArea Área asignada al usuario
   * @returns Array de áreas permitidas o null si tiene acceso a todas
   */
  getAreasByRole(userRole: string, userArea: string): string[] | null {
    switch (userRole) {
      case RolesEnum.ADMIN:
        return null; // Acceso total

      case RolesEnum.DIRECTOR_GENERAL:
        // Buscar las áreas que corresponden a la dirección general
        const areasAsignadas = this.AREAS_POR_DIRECCION[userArea] || [];
        // Incluir su propia área en las áreas permitidas
        return [...new Set([userArea, ...areasAsignadas])];

      case RolesEnum.DIRECTOR:
      case RolesEnum.ENLACE:
        return [userArea];

      default:
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

    return this.getAreasByRole(currentUser.roles as string, currentUser.area);
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
