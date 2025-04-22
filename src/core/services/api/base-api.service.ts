import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected apiUrl = environment.apiUrl;
  protected http = inject(HttpClient);

  /**
   * Realiza una petición GET
   * @param endpoint Endpoint relativo de la API
   * @param params Parámetros opcionales de consulta
   * @returns Observable con la respuesta
   */
  protected get<T>(endpoint: string, params?: Record<string, string | number | boolean | null | undefined>): Observable<T> {
    const options = { params: this.buildHttpParams(params) };
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, options);
  }

  /**
   * Realiza una petición POST
   * @param endpoint Endpoint relativo de la API
   * @param data Datos a enviar
   * @returns Observable con la respuesta
   */
  protected post<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data);
  }

  /**
   * Realiza una petición PUT
   * @param endpoint Endpoint relativo de la API
   * @param data Datos a enviar
   * @returns Observable con la respuesta
   */
  protected put<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data);
  }

  /**
   * Realiza una petición DELETE
   * @param endpoint Endpoint relativo de la API
   * @returns Observable con la respuesta
   */
  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`);
  }

  /**
   * Construye los parámetros HTTP
   */
  protected buildHttpParams(params?: Record<string, string | number | boolean | null | undefined>): HttpParams {
    if (!params) {
      return new HttpParams();
    }

    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
