import { Input } from './input.model';

/**
 * Respuesta general de la API
 */
export interface ApiBaseResponse<T> {
  status: string;
  message?: string;
  data?: T;
  metadata?: any;
}

/**
 * Respuesta específica para getInputById
 */
export interface InputDetailResponse {
  status: string;
  input: Input;
}

/**
 * Respuesta específica para calcularTiempoRespuesta
 */
export interface TiempoRespuestaResponse {
  status: string;
  data: TiempoRespuestaData;
}

/**
 * Estructura de datos para tiempo de respuesta
 */
export interface TiempoRespuestaData {
  tiempo_recepcion: any;
  _id: string;
  num_oficio: string;
  anio: number;
  folio: number;
  asunto: string;
  remitente: string;
  asignado: string;
  estatus: string;
  fecha_recepcion: string | Date;
  fecha_vencimiento: string | Date;
  diferencia_dias: number | null;
  tiempo_transcurrido_dias: number | null;
  estado_semaforo: string | null;
  color_semaforo: string | null;
  estado_tramite: 'FINALIZADO' | 'ATENDIDO SIN ACUSE' | 'EN TRÁMITE';
  tiene_respuesta: boolean;
  dias_efectivos: number | null;
  tiempo_respuesta: string | Date | null;
  diferencia_milisegundos: number | null;
  fecha_actual?: string | Date;
  tiempo_transcurrido_milisegundos?: number;
}
