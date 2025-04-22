import { Injectable } from '@angular/core';

interface StorageItem<T> {
  value: T;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Storage;

  constructor() {
    // Usar localStorage para persistencia
    this.storage = localStorage;
    // Prueba básica de funcionamiento
    try {
      this.storage.setItem('test', 'test');
      const test = this.storage.getItem('test');
      if (test !== 'test') {
        console.error('StorageService: El almacenamiento no funciona correctamente');
      } else {
        this.storage.removeItem('test');
        console.log('StorageService: Funciona correctamente');
      }
    } catch (e) {
      console.error('StorageService: Error accediendo al almacenamiento local', e);
    }
  }

  /**
   * Guarda un item en el almacenamiento local
   */
  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
      console.log(`StorageService: Item '${key}' guardado`);
    } catch (error) {
      console.error('Error al guardar en storage:', error);
    }
  }

  /**
   * Recupera un item del almacenamiento local
   */
  getItem(key: string): string | null {
    try {
      const value = this.storage.getItem(key);
      return value;
    } catch (error) {
      console.error('Error al recuperar de storage:', error);
      return null;
    }
  }

  /**
   * Elimina un item del almacenamiento local
   */
  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Error al eliminar de storage:', error);
    }
  }

  /**
   * Limpia todo el almacenamiento local
   */
  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      console.error('Error al limpiar storage:', error);
    }
  }

  /**
   * Guarda con expiración
   */
  setWithExpiry<T>(key: string, value: T, ttl: number): void {
    const item: StorageItem<T> = {
      value: value,
      expiry: new Date().getTime() + ttl,
    };
    this.setItem(key, JSON.stringify(item));
  }

  /**
   * Obtiene con verificación de expiración
   */
  getWithExpiry<T>(key: string): T | null {
    const itemStr = this.getItem(key);
    if (!itemStr) {
      return null;
    }

    try {
      const item = JSON.parse(itemStr) as StorageItem<T>;
      const now = new Date().getTime();

      if (now > item.expiry) {
        this.removeItem(key);
        return null;
      }
      return item.value;
    } catch {
      return null;
    }
  }
}
