import { Injectable } from '@angular/core';
 import Swal, { SweetAlertIcon } from 'sweetalert2';

 @Injectable({
     providedIn: 'root'
 })
 export class AlertService {

     constructor() { }

     showAlert(title: string, text: string, icon: SweetAlertIcon = 'success'): void {
         Swal.fire({
             title,
             text,
             icon,
             confirmButtonText: 'Aceptar'
         });
     }

     showSuccess(title: string, text: string): void {
         this.showAlert(title, text, 'success');
     }

     showError(title: string, text: string): void {
         this.showAlert(title, text, 'error');
     }

     showWarning(title: string, text: string): void {
         this.showAlert(title, text, 'warning');
     }

     showInfo(title: string, text: string): void {
         this.showAlert(title, text, 'info');
     }

     showQuestion(title: string, text: string): Promise<any> {
         return Swal.fire({
             title,
             text,
             icon: 'question',
             showCancelButton: true,
             confirmButtonText: 'Sí',
             cancelButtonText: 'No'
         });
     }
 }
