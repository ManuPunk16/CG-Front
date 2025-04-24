import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { User } from '../../models/user/user.model';
import { ApiResponse } from '../../models/api-response.model';
import { HttpParams } from '@angular/common/http';

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  area?: string;
  active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PasswordChange {
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseApiService {
  private endpoint = 'users';

  /**
   * Obtiene la lista de usuarios
   */
  getUsers(params?: UserQueryParams): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(this.endpoint, params);
  }

  /**
   * Obtiene un usuario por ID
   * @param id ID del usuario
   * @param params Parámetros adicionales
   */
  getUserById(id: string, params?: any): Observable<ApiResponse<User>> {
    // Si no hay parámetros, llamamos directamente al método get
    if (!params) {
      return this.get<ApiResponse<User>>(`${this.endpoint}/${id}`);
    }

    // Convertir el objeto params a un objeto simple de clave-valor
    // que sea compatible con el tipo esperado por BaseApiService.get
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    Object.keys(params).forEach(key => {
      queryParams[key] = params[key];
    });

    // Pasar el objeto de parámetros directamente (sin envolverlo en { params: ... })
    return this.get<ApiResponse<User>>(`${this.endpoint}/${id}`, queryParams);
  }

  /**
   * Crea un nuevo usuario
   */
  createUser(user: Partial<User>): Observable<ApiResponse<User>> {
    // Cambiar de ${this.endpoint}/register a auth/register
    return this.post<ApiResponse<User>>(`auth/register`, user);
  }

  /**
   * Actualiza un usuario existente
   */
  updateUser(id: string, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.put<ApiResponse<User>>(`${this.endpoint}/${id}`, user);
  }

  /**
   * Cambia la contraseña de un usuario
   */
  changePassword(id: string, passwordData: PasswordChange): Observable<ApiResponse<void>> {
    return this.post<ApiResponse<void>>(`${this.endpoint}/${id}/change-password`, passwordData);
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
