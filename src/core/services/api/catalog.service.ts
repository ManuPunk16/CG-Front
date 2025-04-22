import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { Catalog, CatalogType } from '../../models/catalog.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CatalogService extends BaseApiService {
  private readonly endpoint = `${environment.apiUrl}/catalogs`;

  /**
   * Obtiene la lista de elementos de un catálogo específico
   */
  getCatalogItems(type: CatalogType | string): Observable<string[]> {
    return this.get<ApiResponse<Catalog[]>>(`${this.endpoint}/${type}`)
      .pipe(
        map(response => {
          // Extraer el array de catálogos correctamente de la respuesta
          const catalogs = response.data || [];
          return catalogs.map(item => item.name);
        })
      );
  }

  /**
   * Obtiene los datos crudos del catálogo sin procesamiento
   */
  getRawCatalogItems(type: CatalogType | string): Observable<any> {
    return this.http.get<any>(`${this.endpoint}/${type}`);
  }

  /**
   * Crea un nuevo elemento de catálogo
   */
  createCatalogItem(type: string, name: string): Observable<ApiResponse<Catalog>> {
    return this.post<ApiResponse<Catalog>>(this.endpoint, { type, name });
  }

  /**
   * Actualiza un elemento de catálogo
   */
  updateCatalogItem(id: string, data: Partial<Catalog>): Observable<ApiResponse<Catalog>> {
    return this.put<ApiResponse<Catalog>>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Elimina un elemento de catálogo
   */
  deleteCatalogItem(id: string): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.endpoint}/${id}`);
  }
}
