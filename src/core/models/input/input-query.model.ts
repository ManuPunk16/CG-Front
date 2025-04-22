import { Seguimiento } from './seguimiento.model';

export interface InputQueryParams {
  year?: number;
  area?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  estatus?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface InputSaveParams {
  _id?: string;
  anio?: number;
  folio?: number;
  num_oficio: string;
  fecha_oficio: Date | string;
  fecha_vencimiento?: Date | string;
  fecha_recepcion: Date | string;
  hora_recepcion?: string;
  instrumento_juridico: string;
  remitente: string;
  institucion_origen: string;
  asunto: string;
  asignado: string;
  estatus: string;
  observacion?: string;
  archivosPdf?: string[];
  seguimientos?: Partial<Seguimiento>;
}
