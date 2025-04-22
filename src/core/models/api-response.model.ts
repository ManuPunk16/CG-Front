export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
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
