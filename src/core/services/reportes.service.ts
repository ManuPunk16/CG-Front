import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Global } from '../models/global';
import { Input } from '../models/input.model';
import { EstadisticasUsuario } from '../../interfaces/estadisticas-usuario.interface';

interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
}

interface EstadisticasEstatusResponse {
  areaConsultada: string;
  rangoFechas: {
    fechaInicio: Date;
    fechaFin: Date;
  };
  estadisticas: {
    estatus: string;
    count: number;
  }[];
}

interface DetalleOficio {
  _id: string;
  num_oficio: string;
  tiempo_recepcion: Date;
  tiempo_respuesta: Date;
  asignado: string;
  diferencia_milisegundos: number;
  diferencia_dias: number;
}

interface ResumenTiempos {
  promedio_dias: number | null;
  mediana_dias: number | null;
  percentil25_dias: number | null;
  percentil75_dias: number | null;
  desviacion_estandar_dias: number | null;
  total_atendidos: number | null;
  total_no_atendidos: number | null;
  total_oficios: number;
  datos_oficios: Input[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private apiUrl = Global.url;

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
        // Client-side errors
        errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 204) {
        errorMessage = 'No existen registros'; // Mensaje más descriptivo
        console.warn(errorMessage); // Usar warn para este caso
    } else {
        // Server-side errors
        errorMessage = `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error)}`; // Incluir el cuerpo del error para debugging
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage)); // Lanza un nuevo error con el mensaje formateado
  }

  getAreasPerDay(searchDay: string): Observable<Input[]> {
    const url = `${this.apiUrl}reporte_diario/${searchDay}`;
    return this.http.get<ApiResponse<Input[]>>(url).pipe(
      map((response: ApiResponse<Input[]>) => {
        if (response.status === 'success' && Array.isArray(response.data)) {
          return response.data;
        } else {
          throw new Error('La respuesta del servidor no tiene el formato esperado');
        }
      }),
      catchError(this.handleError)
    );
  }

  getReporteResumen(searchDate: string): Observable<Blob> {
    const url = `${this.apiUrl}reporteresumen/${searchDate}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarExcelEnlaceAnioActual(asignado: string): Observable<Blob> {
    const url = `${this.apiUrl}exportar-excel-enlace-anio-actual/`+ asignado;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarExcelTodosAnioActual(): Observable<Blob> {
    const url = `${this.apiUrl}exportar-excel-todos-anio-actual`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarExcelEnlaceAniosPosteriores(asignado: string, year: number): Observable<Blob> {
    const url = `${this.apiUrl}exportar-excel-enlace-anios-posteriores/${asignado}/${year}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
        catchError(this.handleError)
    );
  }

  exportarExcelTodosAniosPosteriores(year: number): Observable<Blob> {
      const url = `${this.apiUrl}exportar-excel-todos-anios-posteriores/${year}`;
      return this.http.get(url, { responseType: 'blob' }).pipe(
          catchError(this.handleError)
      );
  }

  exportarExcelFormatogenerarReporte(fechaInicio: string, fechaFin?: string, asignado?: string): Observable<Blob> {
    const url = `${this.apiUrl}reporte-rango/`;
    const params = new HttpParams()
    .set('fechaInicio', fechaInicio)
    .set('fechaFin', fechaFin || '')
    .set('area', asignado || '');

    return this.http.get(url, { params, responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarDatosExcelPorEstatusFechaPorArea(estatus: string, asignado: string, fechaInicio: string, fechaFin?: string): Observable<Blob> {
    const url = `${this.apiUrl}reporte_estatus_area/`;
    const params = new HttpParams()
      .set('estatus', estatus)
      .set('area', asignado)
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin || '');

    return this.http.get(url, { params, responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  getTiempoRespuestaPorId(id: string): Observable<DetalleOficio> {
    const url = `${this.apiUrl}tiempos/${id}`;

    return this.http.get<DetalleOficio>(url)
      .pipe(
        map((data: DetalleOficio) => {
          // Convertir las fechas de string a Date
          if (data.tiempo_recepcion) {
            data.tiempo_recepcion = new Date(data.tiempo_recepcion);
          }
          if (data.tiempo_respuesta) {
            data.tiempo_respuesta = new Date(data.tiempo_respuesta);
          }
          return data;
        }),
        catchError(this.handleError)
      );
  }

  calcularTiempoRespuestaTotal(area: string, fechaInicio?: string, fechaFin?: string): Observable<ResumenTiempos> {
    let params = new HttpParams();

    if (fechaInicio) {
      params = params.append('fechaInicio', fechaInicio);
    }
    if (fechaFin) {
      params = params.append('fechaFin', fechaFin);
    }

    return this.http.get<ResumenTiempos>(`${this.apiUrl}tiempos-total/${area}`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  obtenerEstadisticas(startDate: string, endDate: string, area: string): Observable<EstadisticasEstatusResponse> {
      let params = new HttpParams()
        .set('fechaInicio', startDate)
        .set('fechaFin', endDate)
        .set('area', area);

      return this.http.get<EstadisticasEstatusResponse>(`${this.apiUrl}estadisticas_estatus`, { params: params }).pipe(
        catchError(this.handleError)
      );
    }

    obtenerEstadisticasUsuarios(): Observable<EstadisticasUsuario[]> {
      return this.http.get<EstadisticasUsuario[]>(`${this.apiUrl}inputs/ultima-modificacion-areas`)
        .pipe(
          catchError(this.handleError)
        );
    }
}
