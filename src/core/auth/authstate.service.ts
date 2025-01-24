import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private isLoggedInSubject!: BehaviorSubject<boolean>; // Declarar, pero no inicializar aquí
  isLoggedIn$!: Observable<boolean>;

  constructor(private tokenStorageService: TokenStorageService) {
    // Inicializar isLoggedInSubject DENTRO del constructor
    this.isLoggedInSubject = new BehaviorSubject<boolean>(!!this.tokenStorageService.getToken());
    this.isLoggedIn$ = this.isLoggedInSubject.asObservable();
  }

  login() {
    this.isLoggedInSubject.next(true);
  }

  logout() {
    this.tokenStorageService.signOut();
    this.isLoggedInSubject.next(false);
  }
}
