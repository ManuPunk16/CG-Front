import { Injectable } from '@angular/core';
 import { BehaviorSubject } from 'rxjs';

 @Injectable({
     providedIn: 'root'
 })
 export class StateService {

     private isLoadingSubject = new BehaviorSubject<boolean>(false);
     isLoading$ = this.isLoadingSubject.asObservable();

     constructor() { }

     setIsLoading(isLoading: boolean): void {
         this.isLoadingSubject.next(isLoading);
     }

     setIsTrue(isLoading: boolean): void {
         this.isLoadingSubject.next(isLoading);
     }
 }
