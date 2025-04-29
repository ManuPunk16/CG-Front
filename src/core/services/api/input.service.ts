import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { AuthService } from './auth.service';
import { ApiResponse, PaginatedResponse } from '../../models/api-response.model';
import { Input } from '../../models/input/input.model';
import { DuplicateResponseData, DuplicateApiResponse } from '../../models/input/duplicate.model';
import { InputDetailResponse, TiempoRespuestaResponse } from '../../models/input/input-response.model';
import { AreasStatsResponse } from '../../models';
import { HttpParams } from '@angular/common/http';

export interface InputQueryParams {
  year?: number | 'all' | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  estatus?: string;
  asignado?: string; // Asegúrate de que este campo exista
  area?: string;     // Agrega campo alternativo si es necesario
  fecha_recepcion?: string;
  num_oficio?: string;
  folio?: string | number;
  institucion_origen?: string;
  remitente?: string;
  asunto?: string;
  [key: string]: any; // Permite campos adicionales
}

export interface TimeStatsParams {
  area: string;
  fechaInicio: string;
  fechaFin?: string;
  forceRefresh?: boolean;
}

export interface TimeStatsResponse {
  estadisticas: {
    total_oficios: number;
    total_atendidos: number;
    total_no_atendidos: number;
    promedio_dias: number | null;
    mediana_dias: number | null;
    percentil25_dias: number | null;
    percentil75_dias: number | null;
    desviacion_estandar_dias: number | null;
  };
  distribucion_por_categoria: {
    rapido: number;
    normal: number;
    lento: number;
    muy_lento: number;
  };
  datos_oficios: Array<{
    _id: string;
    num_oficio: string;
    anio: number;
    folio: number;
    fecha_recepcion: Date;
    tiempo_respuesta: Date | null;
    asignado: string;
    estatus: string;
    diferencia_dias: number | null;
    categoria_tiempo: 'rapido' | 'normal' | 'lento' | 'muy_lento';
  }>;
}

export interface StatusStatsResponse {
  resumenEstatus: Array<{
    estatus: string;
    count: number;
    oficios: Array<{ id: string; num_oficio: string; folio: number }>;
    porcentaje: number;
  }>;
  distribucionMensual: Array<{
    anio: number;
    mes: number;
    count: number;
    atendidos: number;
    no_atendidos: number;
  }>;
  distribucionEstatus: {
    labels: string[];
    data: number[];
    porcentajes: number[];
  };
}

export interface DuplicateResponse {
  num_oficio: string;
  duplicados: Array<{
    _id: string;
    num_oficio: string;
    folio: number;
    asignado: string;
    fecha_recepcion: Date;
    anio: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class InputService extends BaseApiService {
  private endpoint = 'inputs';
  private authService = inject(AuthService);

  /**
   * Obtiene la lista de inputs con paginación y filtros
   * @param params Parámetros de consulta
   */
  getInputs(params: InputQueryParams): Observable<ApiResponse<PaginatedResponse<Input>>> {
    // Convertir params a URLSearchParams para la consulta
    const queryParams = new URLSearchParams();

    // Agregar cada parámetro no nulo a la consulta
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        queryParams.append(key, String(params[key]));
      }
    });

    const url = `${this.endpoint}?${queryParams.toString()}`;
    return this.get<ApiResponse<PaginatedResponse<Input>>>(url);
  }

  /**
   * Obtiene un input por ID
   */
  getInputById(id: string): Observable<InputDetailResponse> {
    console.log(`Solicitando documento con ID: ${id}`);
    return this.get<InputDetailResponse>(`${this.endpoint}/${id}`).pipe(
      tap(response => console.log(`Respuesta recibida para ID ${id}:`, response)),
      catchError(error => {
        console.error(`Error al obtener documento con ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo input sin depender del servicio de autenticación
   * El backend se encargará de obtener los datos del usuario desde el token JWT
   */
  createInput(input: Partial<Input>): Observable<ApiResponse<Input>> {
    return this.post<ApiResponse<Input>>(`${this.endpoint}/create`, input)
      .pipe(
        catchError(error => {
          console.error('Error al crear registro:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Actualiza un input existente
   */
  updateInput(id: string, inputData: any): Observable<any> {
    // Usar PUT o PATCH directamente con el ID, sin "update" en la ruta
    return this.http.patch<any>(`${this.apiUrl}/${this.endpoint}/update/${id}`, inputData);
  }

  /**
   * Crea o actualiza un seguimiento para un input
   * En el backend, esto se maneja a través de la misma ruta de actualización
   */
  manageSeguimiento(inputId: string, seguimientoData: any): Observable<any> {
    return this.http.patch<any>(`${this.endpoint}/update/${inputId}`, seguimientoData);
  }

  /**
   * Elimina un input (soft delete)
   */
  deleteInput(id: string): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.endpoint}/${id}`);
  }

  /**
   * Verifica si existe un folio para un año específico
   */
  existeFolio(anio: number, folio: number): Observable<boolean> {
    return this.get<boolean>(`${this.endpoint}/existe-folio/${anio}/${folio}`);
  }

  /**
   * Obtiene el último folio de un año específico
   */
  getUltimoFolio(anio: number): Observable<number> {
    return this.get<number>(`${this.endpoint}/ultimo-folio/${anio}`);
  }

  /**
   * Genera reporte diario en Excel
   */
  generarReporteDiario(params: { area: string, fechaInicio: string }): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/reporte-diario`, {
      params: this.buildHttpParams(params),
      responseType: 'blob'
    });
  }

  /**
   * Genera reporte resumen para una fecha específica
   * @param fecha Fecha para el reporte (formato YYYY-MM-DD)
   */
  generarReporteResumen(fechaInicio: string): Observable<Blob> {
    // Corrección: La ruta es /resumen con parámetro fechaInicio
    return this.http.get(`${this.apiUrl}/${this.endpoint}/resumen/${fechaInicio}`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error al generar reporte resumen:', error);
        throw error;
      })
    );
  }

  /**
   * Genera una tarjeta resumen para la fecha especificada, filtrada según permisos
   * @param params Parámetros para generar la tarjeta resumen (fecha y áreas según permisos)
   * @returns Observable con el archivo Blob
   */
  generarTarjetaResumen(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/tarjeta-resumen`, {
      params: this.buildHttpParams(params),
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error al generar tarjeta resumen:', error);
        throw error;
      })
    );
  }

  /**
   * Calcula el tiempo de respuesta de un registro específico
   */
  calcularTiempoRespuesta(id: string): Observable<TiempoRespuestaResponse> {
    return this.get<TiempoRespuestaResponse>(`${this.endpoint}/tiempo-respuesta/${id}`);
  }

  /**
   * Obtiene estadísticas de tiempos de respuesta para un área
   */
  calcularTiempoRespuestaTotal(params: TimeStatsParams): Observable<ApiResponse<TimeStatsResponse>> {
    const { area, ...otherParams } = params;
    return this.get<ApiResponse<TimeStatsResponse>>(`${this.endpoint}/tiempos-respuesta/area/${encodeURIComponent(area)}`, otherParams);
  }

  /**
   * Obtiene estadísticas de estatus para un área
   */
  obtenerEstadisticasEstatus(params: TimeStatsParams): Observable<ApiResponse<StatusStatsResponse>> {
    const { area, ...otherParams } = params;
    return this.get<ApiResponse<StatusStatsResponse>>(`${this.endpoint}/estadisticas/estatus/area/${encodeURIComponent(area)}`, otherParams);
  }

  /**
   * Obtiene registros duplicados por número de oficio
   */
  getDuplicatedOficios(id: string, area?: string): Observable<DuplicateApiResponse> {
    if (area) {
      return this.get<DuplicateApiResponse>(`${this.endpoint}/duplicados/${id}/area/${encodeURIComponent(area)}`);
    }
    return this.get<DuplicateApiResponse>(`${this.endpoint}/duplicados/${id}`);
  }

  /**
   * Obtiene estadísticas para el dashboard
   */
  getRegistrosEstadisticas(params?: { area?: string }): Observable<ApiResponse<{
    direccion: string;
    anios: Array<{
      anio: number;
      meses: Array<{
        mes: number;
        atendido: number;
        noAtendido: number;
        respuestaRegistrada: number;
      }>;
    }>;
  }[]>> {
    return this.get<ApiResponse<any>>(`${this.endpoint}/estadisticas/registros`, params);
  }

  /**
   * Obtiene la última modificación de un usuario específico
   */
  obtenerUltimaModificacionUsuario(usuarioId: string): Observable<ApiResponse<{
    usuario: {
      id: string;
      username: string;
    };
    ultimaModificacion: {
      inputId: string;
      anio: number;
      folio: number;
      timestamp: Date;
    } | null;
  }>> {
    return this.get<ApiResponse<any>>(`${this.endpoint}/usuario/${usuarioId}/ultima-modificacion`);
  }

  /**
   * Obtiene las últimas modificaciones según permisos del usuario
   */
  obtenerUltimasModificaciones(): Observable<ApiResponse<{
    usuario: {
      id: string;
      username: string;
    };
    ultimaModificacion: {
      inputId: string;
      anio: number;
      folio: number;
      timestamp: Date;
    } | null;
  }[]>> {
    return this.get<ApiResponse<any>>(`${this.endpoint}/estadisticas/usuarios`);
  }

  /**
   * Obtiene los años que tienen registros
   */
  getAvailableYears(): Observable<number[]> {
    return this.get<ApiResponse<number[]>>(`${this.endpoint}/available-years`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error obteniendo años disponibles', error);
          return of([]);
        })
      );
  }

  /**
   * Obtiene el conteo total de registros
   */
  getTotalCount(): Observable<number> {
    return this.get<ApiResponse<number>>(`${this.endpoint}/total-count`)
      .pipe(
        map(response => response.data || 0),
        catchError(error => {
          console.error('Error obteniendo conteo total', error);
          return of(0);
        })
      );
  }

  /**
   * Exporta datos a Excel
   * @param params Parámetros para la exportación
   * @returns Observable con el archivo Blob
   */
  exportToExcel(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/export`, {
      params: this.buildHttpParams(params),
      responseType: 'blob'
    });
  }

  /**
   * Obtiene estadísticas de registros por área para un año específico
   * @param year Año para filtrar las estadísticas
   */
  getEstadisticasRegistros(year?: number): Observable<AreasStatsResponse> {
    // Construimos los parámetros explícitamente para asegurar que se envían correctamente
    const params = new HttpParams().set('year', year ? year.toString() : '');

    // Usamos la URL completa para evitar problemas de concatenación
    const url = `${this.apiUrl}/${this.endpoint}/estadisticas/registros`;

    console.log(`Solicitando estadísticas con URL: ${url}, Parámetros:`, params.toString());

    return this.http.get<AreasStatsResponse>(url, { params }).pipe(
      tap(response => console.log('Respuesta de estadísticas:', response)),
      catchError(error => {
        console.error('Error al obtener estadísticas:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene estadísticas de tiempos de respuesta para un área específica
   * @param area Área a consultar
   * @param fechaInicio Fecha de inicio del periodo (formato YYYY-MM-DD)
   * @param fechaFin Fecha de fin del periodo (formato YYYY-MM-DD)
   */
  getTiemposRespuestaArea(area: string, fechaInicio: string, fechaFin: string): Observable<ApiResponse<any>> {
    const params: any = {};

    // Solo añadir fechas a los parámetros si están definidas
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;

    // Corregir la URL para usar la ruta correcta (añadir 'inputs/')
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/inputs/tiempos-respuesta/area/${encodeURIComponent(area)}`,
      { params }
    );
  }

  /**
   * Obtiene estadísticas de estatus para un área específica
   * @param area Área a consultar
   * @param fechaInicio Fecha de inicio del periodo (formato YYYY-MM-DD)
   * @param fechaFin Fecha de fin del periodo (formato YYYY-MM-DD)
   */
  getEstadisticasEstatusArea(area: string, fechaInicio: string, fechaFin: string): Observable<ApiResponse<any>> {
    const params: any = {};

    // Solo añadir fechas a los parámetros si están definidas
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;

    // Corregir la URL para usar la ruta correcta (añadir 'inputs/')
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/inputs/estadisticas/estatus/area/${encodeURIComponent(area)}`,
      { params }
    );
  }

  /**
   * Obtiene estadísticas de tiempo de respuesta para un oficio específico
   * @param id ID del oficio
   */
  getTiempoRespuestaPorId(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tiempo-respuesta/${id}`);
  }
}
