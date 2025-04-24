import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  /**
   * Muestra una alerta de éxito
   */
  success(message: string, title = 'Éxito', timer = 2000): Promise<void> {
    return this.showAlert({
      title,
      text: message,
      icon: 'success',
      timer,
      timerProgressBar: true
    }).then();
  }

  /**
   * Muestra una alerta de error
   */
  error(message: string, title = 'Error'): Promise<void> {
    return this.showAlert({
      title,
      text: message,
      icon: 'error'
    }).then();
  }

  /**
   * Muestra una alerta de advertencia
   */
  warning(message: string, title = 'Advertencia'): Promise<void> {
    return this.showAlert({
      title,
      text: message,
      icon: 'warning'
    }).then();
  }

  /**
   * Muestra una alerta de información
   */
  info(message: string, title = 'Información'): Promise<void> {
    return this.showAlert({
      title,
      text: message,
      icon: 'info'
    }).then();
  }

  /**
   * Muestra un diálogo de confirmación
   */
  confirm(message: string, title = '¿Está seguro?'): Promise<boolean> {
    return Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => result.isConfirmed);
  }

  /**
   * Muestra un diálogo con formulario personalizado
   * @template T - Tipo de resultado que devuelve el preConfirm
   */
  formDialog<T>(options: {
    title: string;
    html: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    preConfirm: () => T | Promise<T> | false;
  }): Promise<SweetAlertResult<T>> {
    // Usamos una aserción de tipo para resolver el problema de compatibilidad
    return Swal.fire({
      title: options.title,
      html: options.html,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Guardar',
      cancelButtonText: options.cancelButtonText || 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      focusConfirm: false,
      preConfirm: options.preConfirm
    }) as Promise<SweetAlertResult<T>>;
  }

  /**
   * Muestra una alerta personalizada
   */
  private showAlert(options: SweetAlertOptions): Promise<SweetAlertResult<any>> {
    return Swal.fire({
      ...options,
      confirmButtonColor: '#3085d6',
    });
  }
}
