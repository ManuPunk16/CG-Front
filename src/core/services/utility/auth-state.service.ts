import { Injectable, signal } from '@angular/core';
import { User } from '../../models/user/user.model';
import { StorageService } from './storage.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private isAuthenticatedSig = signal<boolean>(false);
  private currentUserSig = signal<User | null>(null);

  // También podemos proporcionar un BehaviorSubject para compatibilidad
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  // Exposición pública como solo lectura - RENAME THIS
  public readonly isAuthenticatedSignal = this.isAuthenticatedSig.asReadonly(); // Cambio de nombre
  public readonly currentUser = this.currentUserSig.asReadonly();

  // Observable para compatibilidad con código que use RxJS
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadFromStorage();
  }

  setAuthenticated(value: boolean): void {
    this.isAuthenticatedSig.set(value);
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSig.set(user);
    this.currentUserSubject.next(user); // Actualizar también el Observable
  }

  reset(): void {
    this.isAuthenticatedSig.set(false);
    this.currentUserSig.set(null);
    this.currentUserSubject.next(null);
  }

  private loadFromStorage(): void {
    const token = this.storageService.getItem('token');
    const userJson = this.storageService.getItem('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.isAuthenticatedSig.set(true);
        this.currentUserSig.set(user);
        this.currentUserSubject.next(user);
      } catch (e) {
        this.reset();
      }
    }
  }

  // El método se mantiene igual
  isAuthenticated(): boolean {
    // Verifica directamente con el Storage primero
    const token = this.storageService.getItem('token');
    if (token) {
      // Si hay token, asegúrate de que el estado interno esté actualizado
      this.isAuthenticatedSig.set(true);
      return true;
    }

    return this.isAuthenticatedSig();
  }
}
