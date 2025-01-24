import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Global } from '../models/global';
import { Role } from '../models/role';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  public url: string;

  constructor(
    private _http: HttpClient
  ) {
    this.url = Global.url;
  }

  getRoles(): Observable<any> {
    return this._http.get<Role[]>(this.url + 'roles');
  }

  getAdminRoles(): Observable<any> {
    return this._http.get<Role[]>(this.url + 'admin-roles');
  }
}
