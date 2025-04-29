import { EstatusEnum } from '../enums/estatus.enum';

/**
 * Usuario básico para referencias
 */
export interface UserRef {
  id: string;
  username: string;
}

/**
 * Modelo para datos de seguimiento
 */
export interface Seguimiento {
  _id?: string;
  oficio_salida: string;
  fecha_respuesta: string | Date;
  usuario?: UserRef;
  comentarios?: string | null;
  archivosPdf_seguimiento?: string[];
  num_expediente: string;
  fecha_oficio_salida: string | Date;
  fecha_acuse_recibido: string | Date;
  destinatario: string;
  cargo: string;
  atencion_otorgada: string;
  anexo: string;
  estatus: string;
  firma_visado: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  fecha_oficio_salida_display?: string;
  fecha_acuse_recibido_display?: string;
}

/**
 * Modelo principal de Input
 */
export interface Input {
  _id: string;
  anio: number;
  folio: number;
  num_oficio: string;
  fecha_oficio: string | Date;
  fecha_vencimiento?: string | Date;
  fecha_recepcion: string | Date;
  hora_recepcion?: string;
  instrumento_juridico?: string;
  remitente: string;
  institucion_origen?: string;
  asunto: string;
  asignado: string;
  estatus: EstatusEnum | string;
  observacion?: string | null;
  archivosPdf?: string[];
  create_user?: UserRef;
  editor_user?: UserRef;
  edit_count: number;
  deleted: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  __v?: number;

  // Propiedades para visualización de fechas
  fecha_oficio_display?: string;
  fecha_recepcion_display?: string;
  fecha_vencimiento_display?: string;

  // Objeto de seguimientos (si existe)
  seguimientos?: Seguimiento;

  // Campos calculados que pueden venir de otros endpoints
  diferencia_dias?: number | null;
  tiempo_recepcion?: string | Date;
  tiempo_respuesta?: string | Date;
  diasAtraso?: number | string;
  mensajeAtraso?: string;
  estadoSemaforo?: string;
  colorSemaforo?: string;
  estado_tramite?: 'FINALIZADO' | 'ATENDIDO SIN ACUSE' | 'EN TRÁMITE';
  tiene_respuesta?: boolean;
  dias_efectivos?: number | null;
  atencion_otorgada_visual?: string;
}
