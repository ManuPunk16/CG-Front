import { Injectable } from '@angular/core';
 import { DatePipe } from '@angular/common';

 @Injectable({
     providedIn: 'root'
 })
 export class DateFormatService {

     constructor(private datePipe: DatePipe) { }

     formatDate(date: Date | string | number, format: string = 'dd/MM/yyyy'): string | null {
         return this.datePipe.transform(date, format);
     }

     formatDateTime(date: Date | string | number, format: string = 'dd/MM/yyyy HH:mm:ss'): string | null {
         return this.datePipe.transform(date, format);
     }
 }
