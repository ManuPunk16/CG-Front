import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Global } from '../models/global';
import { Area } from '../models/area.model';

// Define una interfaz para el formato de la respuesta del backend
interface ApiResponse {
  status: string;
  areas: Area[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private apiUrl = Global.url + 'areas'; // URL del backend

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

  getAllAreas(): Observable<Area[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map((response: ApiResponse) => {
        if (response.status === 'success') {
          return response.areas;
        } else {
          // Si el backend devuelve un error con status 'error', lanzamos un error manejable
          throw new Error(response.message || 'Error al obtener las áreas');
        }
      }),
      catchError(this.handleError) // Manejo de errores
    );
  }
}
