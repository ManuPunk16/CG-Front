import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Global } from '../models/global';
import { Institution } from '../models/institution.model';

interface ApiResponse {
  status: string;
  institutions: Institution[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstitutionsService {

  private apiUrl = Global.url + 'institutions';

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

  getAllNoDeletedInstitutions(): Observable<Institution[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map((response: ApiResponse) => {
        if (response.status === 'success') {
          return response.institutions;
        } else {
          // Si el backend devuelve un error con status 'error', lanzamos un error manejable
          throw new Error(response.message || 'Error al obtener las áreas');
        }
      }),
      catchError(this.handleError) // Manejo de errores
    );
  }

  getInstitutionById(id: string): Observable<Institution> {
      const url = `${this.apiUrl}/${id}`;
      return this.http.get<Institution>(url).pipe(
        map((response: Institution) => {
          if (response.status === 'success') {
            return response;
          } else {
            throw new Error(response.message || 'Error al obtener el institutiono');
          }
        }),
        catchError(this.handleError)
      );
    }

    saveInstitution(institution: Institution): Observable<Institution> {
      return this.http.post<Institution>(this.apiUrl + '/new', institution).pipe(
        map((response: Institution) => {
          if (response.status === 'success') {
            return response;
          } else {
            throw new Error(response.message || 'Error al guardar la institucion');
          }
        }),
        catchError(this.handleError)
      );
    }

    updateInstitution(id: string, institution: Institution): Observable<Institution> {
      const url = `${this.apiUrl}/${id}`;
      return this.http.put<Institution>(url, institution).pipe(
        map((response: Institution) => {
          if (response.status === 'success') {
            return response;
          } else {
            throw new Error(response.message || 'Error al actualizar la institucion');
          }
        }),
        catchError(this.handleError)
      );
    }
}
