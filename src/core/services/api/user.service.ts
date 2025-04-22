import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { User } from '../../models/user.model';

export interface UserQueryParams {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
  role?: string;
  area?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseApiService {
  private endpoint = 'users';

  /**
   * Obtiene la lista de usuarios con paginación y filtros
   */
  getUsers(params?: UserQueryParams): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(this.endpoint, params);
  }

  /**
   * Obtiene un usuario por ID
   */
  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.get<ApiResponse<User>>(`${this.endpoint}/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  createUser(user: Partial<User>): Observable<ApiResponse<User>> {
    return this.post<ApiResponse<User>>(this.endpoint, user);
  }

  /**
   * Actualiza un usuario existente
   */
  updateUser(id: string, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.put<ApiResponse<User>>(`${this.endpoint}/${id}`, user);
  }

  /**
   * Cambiar contraseña de usuario
   */
  changePassword(id: string, passwords: PasswordChange): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>>(`${this.endpoint}/${id}/change-password`, passwords);
  }

  /**
   * Activa/desactiva un usuario
   */
  toggleUserStatus(id: string, active: boolean): Observable<ApiResponse<void>> {
    return this.put<ApiResponse<void>>(`${this.endpoint}/${id}/status`, { active });
  }

  /**
   * Obtiene el perfil del usuario actual
   */
  getCurrentUserProfile(): Observable<ApiResponse<User>> {
    return this.get<ApiResponse<User>>(`${this.endpoint}/profile`);
  }
}
