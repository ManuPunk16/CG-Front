import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Global } from '../models/global';
import { Input } from '../models/input.model';

interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
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

  exportarExcelEnlaceAniosPosteriores(asignado: string): Observable<Blob> {
    const url = `${this.apiUrl}exportar-excel-enlace-anios-posteriores/`+ asignado;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarExcelTodosAniosPosteriores(): Observable<Blob> {
    const url = `${this.apiUrl}exportar-excel-todos-anios-posteriores`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  exportarExcelFormatogenerarReporte(fechaInicio: string, fechaFin?: string): Observable<Blob> {
    const url = `${this.apiUrl}reporte-rango/`;
    const params = new HttpParams()
    .set('fechaInicio', fechaInicio)
    .set('fechaFin', fechaFin || '');

    return this.http.get(url, { params, responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }
}
