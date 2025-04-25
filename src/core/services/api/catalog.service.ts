import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../../models/api-response.model';
import { Catalog, CatalogType } from '../../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService extends BaseApiService {
  /**
   * Obtiene la lista de elementos de un catálogo específico
   */
  getCatalogItems(type: CatalogType | string): Observable<string[]> {
    // Usar solo la ruta relativa "catalogs/{type}"
    return this.get<ApiResponse<Catalog[]>>(`catalogs/${type.toLowerCase()}`)
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
   * @param type Tipo de catálogo
   * @param limit Límite de registros a obtener (por defecto 1000)
   */
  getRawCatalogItems(type: CatalogType | string, limit: number = 1000): Observable<any> {
    // Añadir parámetro limit para obtener más registros
    const params = { limit: limit.toString() };
    return this.get<any>(`catalogs/${type.toLowerCase()}`, params);
  }

  /**
   * Crea un nuevo elemento de catálogo
   */
  createCatalogItem(type: string, name: string): Observable<ApiResponse<Catalog>> {
    // Enviar el tipo en el cuerpo de la petición en lugar de en la URL
    return this.post<ApiResponse<Catalog>>('catalogs', { type, name });
  }

  /**
   * Actualiza un elemento de catálogo
   */
  updateCatalogItem(id: string, data: Partial<Catalog>): Observable<ApiResponse<Catalog>> {
    return this.put<ApiResponse<Catalog>>(`catalogs/${id}`, data);
  }

  /**
   * Elimina un elemento de catálogo
   */
  deleteCatalogItem(id: string): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`catalogs/${id}`);
  }

  /**
   * Obtiene elementos de catálogo con paginación
   * @param type Tipo de catálogo
   * @param params Parámetros de paginación y filtrado
   */
  getCatalogItemsPaginated(type: string, params: any): Observable<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(`catalogs/${type.toLowerCase()}`, params);
  }
}
