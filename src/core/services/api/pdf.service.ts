import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { PdfListResponse, PdfMetadata } from '../../models/pdf.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService extends BaseApiService {
  private endpoint = 'pdf';

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
   * Obtiene la URL completa para un PDF
   */
  getPdfUrl(id: string, filename: string, isSeguimiento = false): string {
    const baseUrl = `${this.apiUrl}/${this.endpoint}`;
    if (isSeguimiento) {
      return `${baseUrl}/seguimiento/download/${id}?filename=${encodeURIComponent(filename)}`;
    }
    return `${baseUrl}/download/${id}?filename=${encodeURIComponent(filename)}`;
  }
}
