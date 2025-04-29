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
   * Formatea una fecha para enviarla al backend
   * @param date Fecha a formatear
   * @returns Fecha en formato yyyy-MM-dd
   */
  formatToBackendDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  /**
   * Ajusta una fecha para enviar al backend con compensación de zona horaria
   * @param dateStr Fecha en formato 'YYYY-MM-DD'
   * @returns Fecha con la zona horaria ajustada para que se guarde correctamente
   */
  adjustDateForBackend(dateStr: string): string {
    if (!dateStr) return '';

    // Crear una nueva fecha a partir del string, estableciendo la hora al mediodía
    const fecha = new Date(dateStr);
    fecha.setHours(12, 0, 0, 0);

    // Devolver la fecha en formato YYYY-MM-DD
    return this.formatToBackendDate(fecha);
  }

  /**
   * Asegura que una fecha se muestre correctamente compensando la zona horaria
   * @param date Fecha a formatear
   * @returns Fecha formateada correctamente
   */
  formatDateDisplay(date: Date | string | null | undefined): string {
    if (!date) return '';

    // Si es string, convertir a Date
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Crear una nueva fecha usando UTC para evitar ajustes de zona horaria
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();

    // Crear una nueva fecha sin conversión de zona horaria
    const localDate = new Date(year, month, day);

    // Formatear la fecha local
    return this.formatShort(localDate);
  }
}
