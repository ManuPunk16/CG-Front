import { EstatusEnum } from '../enums/estatus.enum';
import { Seguimiento } from './seguimiento.model';
import { User } from '../user/user.model';

export interface Input {
  _id: string;
  anio: number;
  folio: number;
  num_oficio: string;
  fecha_oficio: Date;
  fecha_vencimiento?: Date;
  fecha_recepcion: Date;
  hora_recepcion?: string;
  instrumento_juridico: string;
  remitente: string;
  institucion_origen: string;
  asunto: string;
  asignado: string;
  estatus: EstatusEnum | string;
  observacion: string;
  archivosPdf: string[];
  create_user: {
    id: string;
    username: string;
    createdAt?: Date;
  };
  editor_user?: {
    id: string;
    username: string;
    editedAt?: Date;
  };
  edit_count: number;
  deleted: boolean;
  seguimientos: Seguimiento;
  createdAt?: Date;
  updatedAt?: Date;

  // Campos calculados
  diferencia_dias?: number | null;
  tiempo_recepcion?: Date;
  tiempo_respuesta?: Date;
  diasAtraso?: number | string;
  mensajeAtraso?: string;
  estadoSemaforo?: string;
  colorSemaforo?: string;
  estado_tramite?: 'FINALIZADO' | 'ATENDIDO SIN ACUSE' | 'EN TRÁMITE';
  tiene_respuesta?: boolean;
  dias_efectivos?: number | null;
  atencion_otorgada_visual?: string;
}
