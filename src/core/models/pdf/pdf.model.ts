export interface PdfMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: Date;
  exists: boolean;
  url: string;
  error?: string;
  tipo?: string;
}

export interface PdfListResponse {
  inputId: string;
  principales: PdfMetadata[];
  seguimiento: PdfMetadata[];
}

export interface PdfAccessResponse {
  hasAccess: boolean;
  reason?: string;
}
