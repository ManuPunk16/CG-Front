import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable({
  providedIn: 'root',
  deps: [DatePipe]
})
export class DateFormatService {
  constructor(private datePipe: DatePipe) {}

  /**
   * Formatea una fecha en formato corto (DD/MM/YYYY)
   */
  formatShort(date: Date | string | null | undefined): string {
    if (!date) return '';
    const validDate = this.ensureDate(date);
    if (!isValid(validDate)) return '';

    return format(validDate, 'dd/MM/yyyy', { locale: es });
  }

  /**
   * Formatea una fecha en formato largo (DD de MMMM de YYYY)
   */
  formatLong(date: Date | string | null | undefined): string {
    if (!date) return '';
    const validDate = this.ensureDate(date);
    if (!isValid(validDate)) return '';

    return format(validDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  }

  /**
   * Formatea una fecha con hora (DD/MM/YYYY HH:mm)
   */
  formatWithTime(date: Date | string | null | undefined): string {
    if (!date) return '';
    const validDate = this.ensureDate(date);
    if (!isValid(validDate)) return '';

    return format(validDate, 'dd/MM/yyyy HH:mm', { locale: es });
  }

  /**
   * Convierte un string o Date a objeto Date
   */
  ensureDate(date: Date | string): Date {
    if (typeof date === 'string') {
      return parseISO(date);
    }
    return date;
  }

  /**
   * Devuelve la fecha actual en formato ISO
   */
  getCurrentDateIso(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  /**
   * Calcula la diferencia en días entre dos fechas
   */
  daysBetween(startDate: Date | string, endDate: Date | string): number {
    const start = this.ensureDate(startDate);
    const end = this.ensureDate(endDate);

    if (!isValid(start) || !isValid(end)) {
      return 0;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
