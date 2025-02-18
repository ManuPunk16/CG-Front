import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Global } from '../models/global';

const API_URL = Global.url + 'test/';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getPublicContent(): Observable<any>{
    return this.http.get(API_URL + 'all', {responseType: 'text'});
  }

  getUserBoard(): Observable<any>{
    return this.http.get(API_URL + 'user', {responseType: 'text'});
  }

  getLinkerBoard(): Observable<any>{
    return this.http.get(API_URL + 'linker', {responseType: 'text'});
  }

  getModeratorBoard(): Observable<any>{
    return this.http.get(API_URL + 'mod', {responseType: 'text'});
  }

  getAdminBoard(): Observable<any>{
    return this.http.get(API_URL + 'admin', {responseType: 'text'});
  }
}
