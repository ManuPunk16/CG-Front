export interface UltimaModificacion {
  anio: number | null;
  folio: number | null;
  num_oficio: string | null;
  estatus: string | null;
  fecha_respuesta: string | null;
}

export interface EstadisticasUsuario {
  username: string;
  area: string;
  count: number;
  ultima_modificacion: UltimaModificacion;
}
