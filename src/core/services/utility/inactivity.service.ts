import { Injectable } from '@angular/core';
import { Observable, Subject, fromEvent, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private readonly activityEvents = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  private activitySubject = new Subject<void>();
  private eventSubscriptions: any[] = [];

  /**
   * Inicia la monitorización de actividad del usuario
   */
  startWatching(): void {
    // Limpiar suscripciones existentes
    this.stopWatching();

    // Crear un observable para cada tipo de evento
    const observables = this.activityEvents.map(eventName =>
      fromEvent(document, eventName)
    );

    // Combinar todos los eventos en uno solo
    const activityObservable = merge(...observables).pipe(
      debounceTime(300) // Evitar disparar demasiados eventos
    );

    // Suscribirse al evento combinado y notificar actividad
    activityObservable.subscribe(() => {
      this.activitySubject.next();
    });
  }

  /**
   * Detiene la monitorización de actividad
   */
  stopWatching(): void {
    this.eventSubscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.eventSubscriptions = [];
  }

  /**
   * Retorna un Observable que emite cuando hay actividad del usuario
   */
  onActivity(): Observable<void> {
    return this.activitySubject.asObservable();
  }
}
