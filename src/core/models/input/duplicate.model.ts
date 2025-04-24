/**
 * Modelo que representa un documento duplicado individual
 */
export interface DuplicatedDocument {
  _id: string;
  anio: number;
  folio: number;
  num_oficio: string;
  fecha_recepcion: string;
  remitente: string;
  institucion_origen?: string;
  asunto: string;
  asignado: string;
  estatus: string;
}

/**
 * Contenido de datos de la respuesta de duplicados
 */
export interface DuplicateResponseData {
  num_oficio: string;
  total: number;
  documentos: DuplicatedDocument[];
}

/**
 * Metadatos de la respuesta de duplicados
 */
export interface DuplicateMetadata {
  inputId: string;
  num_oficio: string;
  totalDocumentos: number;
  filtroArea: string;
}

/**
 * Respuesta completa de la API para duplicados
 */
export interface DuplicateApiResponse {
  status: string;
  message: string;
  metadata: DuplicateMetadata;
  data: DuplicateResponseData;
}
