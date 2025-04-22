import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/ui/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // No mostrar indicador para ciertos tipos de solicitudes (ej. validaciones)
  const skipLoading = req.url.includes('existe-folio') ||
                     req.url.includes('validate-token');

  if (!skipLoading) {
    loadingService.start();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loadingService.stop();
      }
    })
  );
};
