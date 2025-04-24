export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  metadata?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Interfaz específica para respuestas paginadas
export interface PaginatedResponse<T> {
  inputs: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    [key: string]: string;
  };
}
