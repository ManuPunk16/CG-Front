import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Global } from '../models/global';
import { LoginLog } from '../models/login-log.model';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private url = Global.url + 'logs/login';

  constructor(private http: HttpClient) {}

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

  getUserLoginLogs(): Observable<LoginLog[]> {
    return this.http.get<LoginLog[]>(`${this.url}/user`).pipe(
      catchError(this.handleError)
    );
  }

  getAllLoginLogs(): Observable<LoginLog[]> {
    const url = `${this.url}/all`;
    return this.http.get<LoginLog[]>(url).pipe(
      catchError(this.handleError)
    );
  }
}
