import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private tokenStorageService: TokenStorageService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const token = this.tokenStorageService.getToken();

    if (token) {
      return true; // Usuario autenticado: permite el acceso
    }

    // Usuario no autenticado: redirige al login y guarda la URL actual
    return this.router.parseUrl(`/login?returnUrl=${state.url}`); // Usa parseUrl para devolver UrlTree
  }
}
