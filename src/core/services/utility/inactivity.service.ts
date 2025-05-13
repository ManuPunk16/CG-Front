import { Injectable } from '@angular/core';
import { Observable, Subject, fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private activitySubject = new Subject<void>();
  private eventSubscriptions: Subscription[] = [];

  // Ampliar la lista de eventos monitoreados
  private activityEvents = [
    'mousedown', 'mousemove', 'keydown',
    'wheel', 'DOMMouseScroll', 'mousewheel',
    'touchstart', 'touchmove', 'touchend',
    'click', 'scroll', 'resize'
  ];

  /**
   * Devuelve un Observable que emite cuando hay actividad del usuario
   */
  onActivity(): Observable<void> {
    return this.activitySubject.asObservable();
  }

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
    const subscription = activityObservable.subscribe(() => {
      console.log('Actividad detectada'); // Agregar log para depuración
      this.activitySubject.next();
    });

    this.eventSubscriptions.push(subscription);

    // Log para verificar que el monitoreo está activo
    console.log('Monitoreo de inactividad iniciado');
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
    console.log('Monitoreo de inactividad detenido');
  }
}
