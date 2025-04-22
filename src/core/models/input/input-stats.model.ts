export interface TimeStatsParams {
  area: string;
  fechaInicio: string;
  fechaFin?: string;
  forceRefresh?: boolean;
}

export interface TimeStatsResponse {
  estadisticas: {
    total_oficios: number;
    total_atendidos: number;
    total_no_atendidos: number;
    promedio_dias: number | null;
    mediana_dias: number | null;
    percentil25_dias: number | null;
    percentil75_dias: number | null;
    desviacion_estandar_dias: number | null;
  };
  distribucion_por_categoria: {
    rapido: number;
    normal: number;
    lento: number;
    muy_lento: number;
  };
  datos_oficios: Array<{
    _id: string;
    num_oficio: string;
    anio: number;
    folio: number;
    fecha_recepcion: Date;
    tiempo_respuesta: Date | null;
    asignado: string;
    estatus: string;
    diferencia_dias: number | null;
    categoria_tiempo: 'rapido' | 'normal' | 'lento' | 'muy_lento';
  }>;
}

export interface StatusStatsResponse {
  resumenEstatus: Array<{
    estatus: string;
    count: number;
    oficios: Array<{ id: string; num_oficio: string; folio: number }>;
    porcentaje: number;
  }>;
  distribucionMensual: Array<{
    anio: number;
    mes: number;
    count: number;
    atendidos: number;
    no_atendidos: number;
  }>;
  distribucionEstatus: {
    labels: string[];
    data: number[];
    porcentajes: number[];
  };
}

export interface DuplicateResponse {
  num_oficio: string;
  duplicados: Array<{
    _id: string;
    num_oficio: string;
    folio: number;
    asignado: string;
    fecha_recepcion: Date;
    anio: number;
  }>;
}

/**
 * Modelo para estadísticas de áreas
 */
export interface AreaStats {
  area: string;
  total: number;
  atendidos: number;
  no_atendidos: number;
  pendientes?: number;
}

/**
 * Modelo para datos de mes en estadísticas
 */
export interface MesStats {
  mes: number;
  atendido: number;
  noAtendido: number;
  respuestaRegistrada: number;
}

/**
 * Modelo para datos de año en estadísticas
 */
export interface AnioStats {
  anio: number;
  meses: MesStats[];
}

/**
 * Modelo para estadísticas por dirección
 */
export interface DireccionStats {
  direccion: string;
  anios: AnioStats[];
}

/**
 * Respuesta de la API para estadísticas de áreas
 */
export interface AreasStatsResponse {
  status: string;
  message: string;
  metadata: {
    userRole: string;
    userArea: string;
    filtroArea: any;
    totalDirecciones: number;
  };
  data: DireccionStats[];
}
