import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Input } from '../models/input.model';
import { Global } from '../models/global';

interface InputsResponse {
  status: string;
  inputs: Input[];
  totalInputs: number;
  totalPages: number;
  currentPage: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InputService {
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

  getNoDeletedInputs(): Observable<InputsResponse> {
    let params = new HttpParams();

    return this.http.get<InputsResponse>(`${this.apiUrl}inputs`, { params }).pipe(
        catchError(this.handleError)
    );
  }

  getNoDeletedInputsByNormalUsers(asignado: string): Observable<InputsResponse> {
    let params = new HttpParams();

    return this.http.get<InputsResponse>(`${this.apiUrl}inputs_area/` + asignado, { params }).pipe(
        catchError(this.handleError)
    );
  }

  getInputById(id: string): Observable<InputsResponse> {
    const url = `${this.apiUrl}inputById/${id}`;
    return this.http.get<InputsResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  getPdfByIdInput(id: string, filename: string): Observable<Blob> {
    const url = `${this.apiUrl}pdfs/${id}/download?filename=${filename}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }

  getPdfByIdSeguimiento(id: string, filename: string): Observable<Blob> {
    const url = `${this.apiUrl}pdfs_seguimiento/${id}/download?filename=${filename}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(this.handleError)
    );
  }
}
