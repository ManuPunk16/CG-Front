import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { LoginLog } from '../../models/login-log.model';
import { LogStats } from '../../models/log-stats.model';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private apiUrl = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los logs de inicio de sesión del usuario actual
   */
  getUserLoginLogs(): Observable<ApiResponse<LoginLog[]>> {
    return this.http.get<ApiResponse<LoginLog[]>>(`${this.apiUrl}/login/user`);
  }

  /**
   * Obtiene todos los logs de inicio de sesión (solo para admin/director)
   * @param params Parámetros de filtrado y paginación
   */
  getAllLoginLogs(params?: {
    username?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    page?: number;
    area?: string;
  }): Observable<ApiResponse<LoginLog[]>> {
    return this.http.get<ApiResponse<LoginLog[]>>(`${this.apiUrl}/login/all`, { params });
  }

  /**
   * Obtiene estadísticas de inicio de sesión (solo para admin/director)
   * @param params Parámetros para las estadísticas
   */
  getLoginStats(params?: { days?: number, area?: string }): Observable<ApiResponse<LogStats>> {
    return this.http.get<ApiResponse<LogStats>>(`${this.apiUrl}/login/stats`, { params });
  }
}
