import { User } from '../user/user.model';

export interface Seguimiento {
  fecha_respuesta: Date | null;
  oficio_salida: string;
  num_expediente: string;
  fecha_oficio_salida?: Date | null;
  fecha_acuse_recibido?: Date | null;
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
  editor_user?: {
    id: string;
    username: string;
    editedAt: Date;
  };
  edit_count?: number;
  timestamps?: Date;
}
