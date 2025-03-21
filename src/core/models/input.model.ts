export interface Input {
  _id: string;
  anio: number;
  folio: number;
  num_oficio: string; // Uppercase enforced on backend
  fecha_oficio: Date;
  fecha_vencimiento?: Date; // Optional
  fecha_recepcion: Date;
  hora_recepcion?: string; // Optional, consider Time type if supported
  instrumento_juridico: string;
  remitente: string;
  institucion_origen: string;
  asunto: string;
  asignado: string;
  estatus: string;
  observacion: string;
  archivosPdf: string[];
  create_user: {
    id: string;
    username: string;
  };
  editor_user?: { // Optional
    id: string;
    username: string;
  };
  edit_count: number;
  deleted: boolean;
  seguimientos: Seguimiento;
  timestamps: Date;
  diferencia_dias: number | null;
  tiempo_recepcion: Date;
  tiempo_respuesta: Date;
  atencion_otorgada_visual: string;
  diasAtraso: number;
  mensajeAtraso: string;
  estadoSemaforo: string;
  colorSemaforo: string;
}

export interface Seguimiento {
  fecha_respuesta: Date;
  oficio_salida: string;
  num_expediente: string;
  fecha_oficio_salida?: Date;
  fecha_acuse_recibido?: Date;
  destinatario: string;
  cargo: string;
  atencion_otorgada?: string;
  anexo?: string;
  comentarios: string;
  firma_visado?: string;
  archivosPdf_seguimiento: string[];
  usuario: {
    id: string;
    username: string;
  };
  timestamps: Date;
}
