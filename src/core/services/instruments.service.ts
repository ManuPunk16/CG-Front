import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Global } from '../models/global';
import { Instrument } from './../models/instrument.model';

interface ApiResponse {
  status: string;
  instrument: Instrument[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstrumentsService {

  private apiUrl = Global.url + 'instruments';

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

  getAllNoDeletedInstruments(): Observable<Instrument[]> {
      return this.http.get<ApiResponse>(this.apiUrl).pipe(
        map((response: ApiResponse) => {
          if (response.status === 'success') {
            return response.instrument;
          } else {
            // Si el backend devuelve un error con status 'error', lanzamos un error manejable
            throw new Error(response.message || 'Error al obtener las áreas');
          }
        }),
        catchError(this.handleError) // Manejo de errores
      );
  }

  getInstrumentById(id: string): Observable<Instrument> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Instrument>(url).pipe(
      map((response: Instrument) => {
        if (response.status === 'success') {
          return response;
        } else {
          throw new Error(response.message || 'Error al obtener el instrumento');
        }
      }),
      catchError(this.handleError)
    );
  }

  saveInstrument(instrument: Instrument): Observable<Instrument> {
    return this.http.post<Instrument>(this.apiUrl + '/new', instrument).pipe(
      map((response: Instrument) => {
        if (response.status === 'success') {
          return response;
        } else {
          throw new Error(response.message || 'Error al guardar el instrumento');
        }
      }),
      catchError(this.handleError)
    );
  }

  updateInstrument(id: string, instrument: Instrument): Observable<Instrument> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<Instrument>(url, instrument).pipe(
      map((response: Instrument) => {
        if (response.status === 'success') {
          return response;
        } else {
          throw new Error(response.message || 'Error al actualizar el instrumento');
        }
      }),
      catchError(this.handleError)
    );
  }
}
