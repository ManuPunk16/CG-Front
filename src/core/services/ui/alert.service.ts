import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  /**
   * Muestra una alerta de éxito
   */
  success(message: string, title = 'Éxito'): Promise<void> {
    return this.showAlert({
      title,
      text: message,
      icon: 'success'
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
      confirmButtonColor: '#3f51b5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => result.isConfirmed);
  }

  /**
   * Muestra una alerta personalizada
   */
  private showAlert(options: SweetAlertOptions): Promise<unknown> {
    return Swal.fire({
      ...options,
      confirmButtonColor: '#3f51b5',
    });
  }
}
