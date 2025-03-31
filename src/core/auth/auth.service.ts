import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Global } from '../models/global';
import { TokenStorageService } from './token-storage.service';

const AUTH_API = Global.url + 'auth/';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  public refreshToken$: Observable<string | null> = this.refreshTokenSubject.asObservable();

  constructor( private http: HttpClient, private tokenStorage: TokenStorageService ) { }

  login(username: string, password: string): Observable<any> {
    return this.http.post<{ refreshToken: string }>(AUTH_API + 'signin', {
          username,
          password
        }, httpOptions).pipe(
      tap((data: { refreshToken: string; accessToken?: string }) => {
        // Guarda el refresh token en el almacenamiento local
        localStorage.setItem('refresh-token', data.refreshToken);
        this.refreshTokenSubject.next(data.refreshToken);
      })
    );
  }

  register(name: string, username: string, email: string, area: string, password: string, roles?: string[]):Observable<any>{
    const user = { name, username, email, area, password, roles };
    return this.http.post(AUTH_API + 'signup', user, httpOptions);
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh-token');
    if (!refreshToken) {
      // No hay refresh token, el usuario debe iniciar sesión
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<{ accessToken: string; refreshToken: string }>(AUTH_API + 'refreshtoken', { refreshToken }, httpOptions).pipe(
      tap((data) => {
        // Guarda el nuevo token de acceso y refresh token
        this.tokenStorage.saveToken(data.accessToken);
        localStorage.setItem('refresh-token', data.refreshToken);
        this.refreshTokenSubject.next(data.refreshToken);
      }),
      catchError(err => {
        // Si el refresh token es inválido, cierra la sesión
        this.tokenStorage.signOut();
        this.refreshTokenSubject.next(null);
        return throwError(() => err);
      })
    );
  }
}
