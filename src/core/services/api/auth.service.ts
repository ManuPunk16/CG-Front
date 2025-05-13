import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { AuthResponse, AuthRequest } from '../../models/user/auth.model';
import { StorageService } from '../utility/storage.service';
import { AuthStateService } from '../utility/auth-state.service';
import { User } from '../../models/user/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseApiService {
  private endpoint = 'auth';
  private storageService = inject(StorageService);
  private authStateService = inject(AuthStateService);
  private router = inject(Router);  // Inyectar el Router

  /**
   * Iniciar sesión
   */
  login(username: string, password: string): Observable<any> {
    const request: AuthRequest = { username, password };

    return this.post<any>(`${this.endpoint}/login`, request)
      .pipe(
        tap(response => {
          // console.log('Respuesta de login recibida:', response);
          // La respuesta ya contiene los datos, no 'response.data'
          this.setSession(response);
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Cerrar sesión
   */
  logout(): Observable<ApiResponse<void>> {
    // Verificar si hay un token válido antes de intentar logout en el servidor
    const token = localStorage.getItem('token');

    // Si no hay token, simplemente limpiamos la sesión local sin llamar al API
    if (!token) {
      this.clearSession();
      return of({ status: 'success', message: 'Sesión local terminada' } as ApiResponse<void>);
    }

    return this.post<ApiResponse<void>>(`${this.endpoint}/logout`, {})
      .pipe(
        tap(() => {
          this.clearSession();
        }),
        catchError(error => {
          // Siempre limpiar la sesión local, independientemente del error
          this.clearSession();

          // Si es error 401, no propagar el error
          if (error?.status === 401) {
            console.log('Token expirado durante logout, sesión limpiada localmente');
            return of({ status: 'success', message: 'Sesión local terminada' } as ApiResponse<void>);
          }

          return throwError(() => error);
        })
      );
  }

  /**
   * Validar token
   */
  validateToken(): Observable<ApiResponse<{ isValid: boolean }>> {
    return this.get<ApiResponse<{ isValid: boolean }>>(`${this.endpoint}/validate-token`);
  }

  /**
   * Refrescar token automáticamente
   */
  refreshToken(): Observable<any> {
    return this.post<any>(`${this.endpoint}/refresh-token`, {})
      .pipe(
        tap(response => {
          if (response && response.accessToken) {
            // Actualizar solo el token, mantener el usuario
            localStorage.setItem('token', response.accessToken);
            this.authStateService.setAuthenticated(true);
            console.log('Token refrescado automáticamente');
          }
        }),
        catchError(error => {
          console.error('Error al refrescar token:', error);
          // Si falla el refresh, no cerrar sesión inmediatamente
          return throwError(() => error);
        })
      );
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    // Asegúrate de que esta función funcione correctamente
    const isAuth = this.authStateService.isAuthenticated();
    // console.log('¿Usuario autenticado?', isAuth);
    return isAuth;
  }

  /**
   * Obtiene el usuario actual
   * @returns El usuario autenticado o null si no hay sesión
   */
  getCurrentUser(): User | null {
    return this.authStateService.currentUser();
  }

  /**
   * Guardar la sesión del usuario
   */
  private setSession(authResponse: any): void {
    // console.log('setSession recibió:', authResponse);

    // En lugar de esperar authResult.accessToken, verificar si viene directamente
    const accessToken = authResponse.accessToken;
    const user = authResponse.user;

    if (!accessToken || !user) {
      console.error('Error: No hay token o usuario en la respuesta', authResponse);
      return;
    }

    // console.log('Guardando token directamente en localStorage:', accessToken.substring(0, 20) + '...');

    try {
      // Guardar directamente en localStorage sin usar el servicio
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Verificación inmediata
      const savedToken = localStorage.getItem('token');
      // console.log('Token guardado correctamente en localStorage:', !!savedToken);

      // Actualizar estado de autenticación
      this.authStateService.setAuthenticated(true);
      this.authStateService.setCurrentUser(user);

      // console.log('Usuario autenticado:', user);
    } catch (error) {
      console.error('Error al guardar la sesión:', error);
    }
  }

  /**
   * Limpiar la sesión del usuario
   */
  private clearSession(): void {
    this.storageService.removeItem('token');
    this.storageService.removeItem('user');

    // Resetear estado de autenticación
    this.authStateService.reset();
  }

  /**
   * Recarga el estado de autenticación desde el storage
   */
  reloadAuthState(): void {
    try {
      const tokenString = localStorage.getItem('token');
      const userString = localStorage.getItem('user');

      // console.log('reloadAuthState - token exists:', !!tokenString);

      if (tokenString && userString) {
        const user = JSON.parse(userString);
        this.authStateService.setAuthenticated(true);
        this.authStateService.setCurrentUser(user);
        // console.log('Estado de autenticación recargado con éxito');
        return;
      }
    } catch (e) {
      console.error('Error al recargar estado de autenticación:', e);
    }

    // Si llegamos aquí, no se pudo recargar el estado
    this.authStateService.reset();
    console.warn('No se encontraron datos de sesión válidos para recargar');
  }
}
