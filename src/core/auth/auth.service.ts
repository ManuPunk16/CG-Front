import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Global } from '../models/global';

const AUTH_API = Global.url + 'auth/';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor( private http: HttpClient ) { }

  login(username: string, password: string):Observable<any>{
    return this.http.post(AUTH_API + 'signin', {
      username,
      password
    }, httpOptions);
  }

  register(name: string, username: string, email: string, area: string, password: string, roles?: string[]):Observable<any>{
    const user = { name, username, email, area, password, roles };
    return this.http.post(AUTH_API + 'signup', user, httpOptions);
  }
}
