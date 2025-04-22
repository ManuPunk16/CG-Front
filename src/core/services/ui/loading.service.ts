import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCount = 0;

  /**
   * Observable que indica si se está cargando algo
   */
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  /**
   * Inicia el indicador de carga
   */
  start(): void {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Detiene el indicador de carga
   */
  stop(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Detiene todos los indicadores de carga
   */
  stopAll(): void {
    this.loadingCount = 0;
    this.loadingSubject.next(false);
  }
}
