import { AlertService } from './../ui/alert.service';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { PdfListResponse, PdfMetadata } from '../../models/pdf.model';
import { HttpHeaders } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PdfService extends BaseApiService {
  private endpoint = 'pdf';

  // Agregar el AlertService al constructor para inyección
  constructor(
    private alertService: AlertService // Inyección del servicio de alertas
  ) {
    super();
  }

  /**
   * Obtiene la lista de PDFs asociados a un input
   */
  getPdfsByInputId(id: string): Observable<ApiResponse<PdfListResponse>> {
    return this.get<ApiResponse<PdfListResponse>>(`${this.endpoint}/list/${id}`);
  }

  /**
   * Descarga un PDF principal
   */
  downloadInputPdf(id: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/download/${id}`, {
      params: { filename },
      responseType: 'blob'
    });
  }

  /**
   * Descarga un PDF de seguimiento
   */
  downloadSeguimientoPdf(id: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/seguimiento/download/${id}`, {
      params: { filename },
      responseType: 'blob'
    });
  }

  /**
   * Verifica si un usuario tiene acceso a un PDF
   */
  validatePdfAccess(id: string, filename: string, type: 'input' | 'seguimiento'): Observable<ApiResponse<{
    hasAccess: boolean;
    reason?: string;
  }>> {
    return this.get<ApiResponse<{
      hasAccess: boolean;
      reason?: string;
    }>>(`${this.endpoint}/access/${id}`, {
      filename,
      type
    });
  }

  /**
   * Obtiene la URL para visualizar un PDF como blob URL
   */
  getPdfUrl(inputId: string, filename: string, isSeguimiento: boolean = false): Observable<string> {
    // Obtener el token
    const token = localStorage.getItem('token');

    if (!token) {
      this.alertService.error('Error de autenticación. Por favor inicie sesión nuevamente.');
      return throwError(() => new Error('No hay token de autenticación disponible'));
    }

    // Construir URL
    const baseUrl = `${this.apiUrl}/pdf/download/${inputId}`;
    const params = new URLSearchParams({ filename });

    // Si es un PDF de seguimiento, añadir el parámetro correspondiente
    if (isSeguimiento) {
      params.append('seguimiento', 'true');
    }

    // Crear cabeceras con el token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Devolver un observable que emita la URL del blob
    return this.http.get(`${baseUrl}?${params.toString()}`, {
      headers: headers,
      responseType: 'blob'
    }).pipe(
      map(blob => {
        // Crear objeto URL para el blob
        return URL.createObjectURL(blob);
      }),
      catchError(error => {
        console.error('Error al obtener el PDF:', error);
        this.alertService.error('Error al cargar el archivo PDF');
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene todos los PDFs asociados a un input (principales y seguimiento)
   */
  getAllInputPdfs(id: string): Observable<ApiResponse<{
    inputId: string,
    principales: PdfMetadata[],
    seguimiento: PdfMetadata[]
  }>> {
    return this.get<ApiResponse<{
      inputId: string,
      principales: PdfMetadata[],
      seguimiento: PdfMetadata[]
    }>>(`${this.endpoint}/all/${id}`);
  }

  /**
   * Descarga un PDF directamente
   */
  downloadPdf(inputId: string, filename: string, isSeguimiento: boolean = false): void {
    // Obtener el token
    const token = localStorage.getItem('token');

    if (!token) {
      this.alertService.error('Error de autenticación. Por favor inicie sesión nuevamente.');
      return;
    }

    // Construir URL con todos los parámetros necesarios
    const baseUrl = `${this.apiUrl}/pdf/download/${inputId}`;
    const params = new URLSearchParams({
      filename: filename,
      token: token
    });

    if (isSeguimiento) {
      params.append('seguimiento', 'true');
    }

    // Crear una solicitud con headers adecuados
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Realizar la descarga
    this.http.get(`${baseUrl}?${params.toString()}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (data) => {
        // Crear un objeto URL para el blob
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        // Crear un enlace temporal y hacer clic para descargar
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // Liberar el objeto URL
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (error) => {
        console.error('Error al descargar PDF:', error);
        this.alertService.error('Error al descargar el archivo PDF');
      }
    });
  }
}
