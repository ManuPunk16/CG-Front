import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, NgIf, NgFor } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';

import { InputService } from '../../../core/services/api/input.service';
import { UserService } from '../../../core/services/api/user.service';
import { PdfService } from '../../../core/services/api/pdf.service';
import { AlertService } from '../../../core/services/ui/alert.service';

import { Input } from '../../../core/models/input/input.model';
import { User } from '../../../core/models/user.model';
import { Subject, Observable, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError, tap } from 'rxjs/operators';
import { DuplicatedDocument } from '../../../core/models/input/duplicate.model';

interface TiempoRespuesta {
  _id: string;
  num_oficio: string;
  anio: number;
  folio: number;
  asunto: string;
  remitente: string;
  asignado: string;
  estatus: string;
  fecha_recepcion: Date;
  fecha_vencimiento: Date;
  dias_efectivos: number | null;

  // Estos campos son necesarios según el error
  tiempo_recepcion?: Date;
  tiempo_respuesta?: Date;
  diferencia_milisegundos?: number;
  diferencia_dias: number;

  // Campos adicionales que pueden estar presentes
  tiempo_transcurrido_dias?: number;
  semaforo?: string;
}

// Actualizamos la interfaz Duplicado para reutilizar DuplicatedDocument
interface Duplicado extends DuplicatedDocument {}

@Component({
  selector: 'app-ficha-tecnica-profesional',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule
  ],
  providers: [DatePipe],
  templateUrl: './ficha-tecnica-profesional.component.html',
  styleUrls: ['./ficha-tecnica-profesional.component.scss']
})
export class FichaTecnicaProfesionalComponent implements OnInit, OnDestroy {
  // Identificador del documento
  id: string = '';

  // Información principal
  inputDetails: Input | null = null;
  tiempoRespuesta: TiempoRespuesta | null = null;
  duplicados: Duplicado[] = [];
  asignador: User | null = null;
  ultimoEditor: User | null = null;

  // Archivos PDF
  pdfUrls: SafeUrl[] = [];
  pdfUrlsSeguimiento: SafeUrl[] = [];
  pdfFilenames: string[] = [];
  pdfFilenamesSeguimiento: string[] = [];
  pdfsCargados: boolean = false;

  // Estados de carga y errores
  loadingInput: boolean = true;
  loadingTiempoRespuesta: boolean = true;
  loadingDuplicados: boolean = true;
  loadingPdfs: boolean = true;
  errorInput: string | null = null;
  errorTiempoRespuesta: string | null = null;
  errorDuplicados: string | null = null;
  errorPdfEntrada: string | null = null;
  errorPdfSeguimiento: string | null = null;

  // Control de suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inputService: InputService,
    private userService: UserService,
    private pdfService: PdfService,
    private alertService: AlertService,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Garantizar que duplicados nunca sea undefined
    this.duplicados = [];

    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.id = params.get('id') || '';
          if (!this.id) {
            this.router.navigate(['/entradas']);
            return of(null);
          }

          // Cargar en paralelo con mejor manejo de errores
          return forkJoin({
            input: this.loadInputDetails().pipe(catchError(err => {
              console.error('Error en detalle:', err);
              return of(null);
            })),
            tiempoRespuesta: this.loadTiempoRespuesta().pipe(catchError(err => {
              console.error('Error en tiempo respuesta:', err);
              return of(null);
            })),
            duplicados: this.loadDuplicados().pipe(catchError(err => {
              console.error('Error en duplicados:', err);
              return of([]);
            }))
          });
        })
      )
      .subscribe({
        next: (results) => {
          console.log('Resultados cargados:', results);

          // Añadir logging detallado para el seguimiento
          if (results?.input?.seguimientos) {
            console.log('Datos de seguimiento disponibles:', results.input.seguimientos);
          }

          // Crear un inputDetails simplificado desde tiempoRespuesta si es necesario
          if (!results?.input && results?.tiempoRespuesta) {
            console.log('Creando inputDetails desde tiempoRespuesta');

            // Usa los datos de tiempoRespuesta para crear un objeto Input básico
            this.inputDetails = {
              _id: results.tiempoRespuesta._id,
              num_oficio: results.tiempoRespuesta.num_oficio,
              anio: results.tiempoRespuesta.anio,
              folio: results.tiempoRespuesta.folio,
              asunto: results.tiempoRespuesta.asunto,
              remitente: results.tiempoRespuesta.remitente,
              asignado: results.tiempoRespuesta.asignado,
              estatus: results.tiempoRespuesta.estatus,
              fecha_recepcion: results.tiempoRespuesta.fecha_recepcion,
              fecha_vencimiento: results.tiempoRespuesta.fecha_vencimiento
            } as Input;
          }

          // Asegurarnos de que la carga termine incluso si results es null
          this.loadingInput = false;

          if (results) {
            // Cargar PDFs y usuarios incluso si algunas respuestas son null
            this.loadPdfs();

            // Solo intenta cargar la info de usuario si el input existe
            if (this.inputDetails) {
              this.loadUserInfo();
            }

            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error general:', error);
          this.alertService.error('Error al cargar la información de la ficha técnica');
          // Asegurarnos de que todos los estados de carga se deshabiliten
          this.loadingInput = false;
          this.loadingTiempoRespuesta = false;
          this.loadingDuplicados = false;
          this.loadingPdfs = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          // Asegurarse de que no quede ningún estado de carga activo
          setTimeout(() => {
            this.loadingInput = false;
            this.loadingTiempoRespuesta = false;
            this.loadingDuplicados = false;
            this.loadingPdfs = false;
            this.cdr.detectChanges();
          }, 500);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los detalles principales del documento
   */
  loadInputDetails(): Observable<Input | null> {
    this.loadingInput = true;

    return this.inputService.getInputById(this.id).pipe(
      map(response => {
        console.log('Respuesta completa de getInputById:', response);

        if (response && response.status === 'success' && response.input) {
          console.log('Datos completos del input:', response.input);
          this.inputDetails = response.input;
          return response.input;
        }

        console.warn('No se encontraron datos en la respuesta:', response);
        return null;
      }),
      catchError(error => {
        console.error('Error al cargar detalles del documento:', error);
        this.errorInput = 'No se pudo cargar la información del documento.';
        this.loadingInput = false;
        return of(null);
      }),
      tap(() => {
        this.loadingInput = false;
        this.cdr.detectChanges();
      })
    );
  }

  /**
   * Carga información sobre el tiempo de respuesta
   */
  loadTiempoRespuesta(): Observable<TiempoRespuesta | null> {
    this.loadingTiempoRespuesta = true;

    return this.inputService.calcularTiempoRespuesta(this.id).pipe(
      map(response => {
        console.log('Respuesta completa de calcularTiempoRespuesta:', response);

        if (response && response.status === 'success' && response.data) {
          // Convertir string a Date para los campos de fecha
          const tiempoData = {
            ...response.data,
            fecha_recepcion: response.data.fecha_recepcion ? new Date(response.data.fecha_recepcion) : new Date(),
            fecha_vencimiento: response.data.fecha_vencimiento ? new Date(response.data.fecha_vencimiento) : new Date(),
            tiempo_recepcion: response.data.tiempo_recepcion ? new Date(response.data.tiempo_recepcion) : undefined,
            tiempo_respuesta: response.data.tiempo_respuesta ? new Date(response.data.tiempo_respuesta) : undefined
          } as TiempoRespuesta;

          this.tiempoRespuesta = tiempoData;
          return tiempoData;
        }

        return null;
      }),
      catchError(error => {
        console.error('Error al cargar tiempo de respuesta:', error);
        this.errorTiempoRespuesta = 'No se pudo cargar la información de tiempo de respuesta.';
        this.loadingTiempoRespuesta = false;
        return of(null);
      }),
      tap(() => {
        this.loadingTiempoRespuesta = false;
        this.cdr.detectChanges();
      })
    );
  }

  /**
   * Obtiene el color del semáforo desde los datos de la API
   * @param data Datos recibidos de la API
   */
  obtenerSemaforoDesdeDatos(data: any): string {
    // Si la API ya proporciona el color del semáforo, usarlo directamente
    if (data.color_semaforo) {
      switch (data.color_semaforo.toLowerCase()) {
        case '#a5d6a7': // Verde en hexadecimal
          return 'verde';
        case '#ffe082': // Amarillo en hexadecimal
        case '#fff9c4':
          return 'amarillo';
        case '#ef9a9a': // Rojo en hexadecimal
          return 'rojo';
        default:
          return 'gris';
      }
    }

    // Si no, calcular basado en el estado o los días
    if (data.estado_semaforo) {
      switch (data.estado_semaforo.toUpperCase()) {
        case 'EN TIEMPO':
          return 'verde';
        case 'POR VENCER':
          return 'amarillo';
        case 'VENCIDO':
          return 'rojo';
        default:
          return 'gris';
      }
    }

    // Si no hay datos de semáforo, usar la función original
    return this.calcularColorSemaforo(
      data.estatus === 'ATENDIDO' ? (data.dias_efectivos || 0) : (data.tiempo_transcurrido_dias || 0),
      data.estatus
    );
  }

  /**
   * Carga documentos duplicados basados en el número de oficio
   */
  loadDuplicados(): Observable<Duplicado[] | null> {
    this.loadingDuplicados = true;

    return this.inputService.getDuplicatedOficios(this.id).pipe(
      map(response => {
        if (response && response.data && response.data.documentos) {
          // Filtrar para no mostrar el documento actual en la lista de duplicados
          const allDuplicados: Duplicado[] = response.data.documentos
            .filter((doc: DuplicatedDocument) => doc._id !== this.id)
            // Utiliza el mapeo automático entre las interfaces que son compatibles
            .map((doc: DuplicatedDocument) => doc);

          this.duplicados = allDuplicados || []; // Garantizar un array incluso si allDuplicados es null
          return allDuplicados;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al cargar documentos duplicados:', error);
        this.errorDuplicados = 'No se pudo cargar la información de documentos relacionados.';
        this.loadingDuplicados = false;
        this.duplicados = []; // Asegurarse de que duplicados es un array vacío en caso de error
        return of([]);
      }),
      tap(() => {
        this.loadingDuplicados = false;
        this.cdr.detectChanges();
      })
    );
  }

  /**
   * Carga los archivos PDF asociados (entrada y seguimiento)
   */
  loadPdfs(): void {
    this.loadingPdfs = true;
    this.pdfUrls = [];
    this.pdfUrlsSeguimiento = [];
    this.pdfFilenames = [];
    this.pdfFilenamesSeguimiento = [];
    this.errorPdfEntrada = null;
    this.errorPdfSeguimiento = null;

    // Usando el PdfService para obtener todos los PDFs directamente
    this.pdfService.getAllInputPdfs(this.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error al cargar lista de PDFs:', error);
        this.errorPdfEntrada = 'Error al obtener la lista de archivos.';
        this.loadingPdfs = false;
        return of({ data: { principales: [], seguimiento: [] } });
      })
    ).subscribe(result => {
      if (result && result.data) {
        const { principales, seguimiento } = result.data;

        // Procesar PDFs principales
        principales.forEach(pdf => {
          if (pdf.exists) {
            const url = this.pdfService.getPdfUrl(this.id, pdf.name);
            this.pdfFilenames.push(pdf.name);
            this.pdfUrls.push(this.sanitizer.bypassSecurityTrustUrl(url));
          }
        });

        // Procesar PDFs de seguimiento
        seguimiento.forEach(pdf => {
          if (pdf.exists) {
            const url = this.pdfService.getPdfUrl(this.id, pdf.name, true);
            this.pdfFilenamesSeguimiento.push(pdf.name);
            this.pdfUrlsSeguimiento.push(this.sanitizer.bypassSecurityTrustUrl(url));
          }
        });

        this.pdfsCargados = true;
      }

      this.loadingPdfs = false;
      this.cdr.detectChanges();
    });
  }

  /**
   * Carga información adicional de usuarios (asignador y último editor)
   */
  loadUserInfo(): void {
    if (!this.inputDetails?.create_user) {
      return;
    }

    // TypeScript ahora sabe que estos valores existen
    const userId = this.inputDetails.create_user.id;
    const username = this.inputDetails.create_user.username;

    this.userService.getUserById(userId, { basicInfo: 'true' }).pipe(
      catchError(error => {
        console.error('Error al cargar datos del usuario creador:', error);

        // Si es error 403, crear un objeto mínimo compatible con User
        if (error.status === 403) {
          return of({
            status: 'success',
            data: {
              _id: userId,
              username: username,
              area: 'No disponible',
              email: '',
              roles: [],
              active: true
            } as unknown as User
          });
        }

        return of(null);
      })
    ).subscribe(response => {
      if (response?.status === 'success' && response.data) {
        this.asignador = response.data;
      }
      this.loadEditorUserInfo();
    });
  }

  loadEditorUserInfo(): void {
    if (!this.inputDetails?.editor_user) {
      return;
    }

    // TypeScript ahora sabe que estos valores existen
    const editorId = this.inputDetails.editor_user.id;
    const editorUsername = this.inputDetails.editor_user.username;

    this.userService.getUserById(editorId, { basicInfo: 'true' }).pipe(
      catchError(error => {
        console.error('Error al cargar datos del usuario editor:', error);

        if (error.status === 403) {
          return of({
            status: 'success',
            data: {
              _id: editorId,
              username: editorUsername,
              area: 'No disponible',
              email: '',
              roles: [],
              active: true
            } as unknown as User
          });
        }

        return of(null);
      })
    ).subscribe(response => {
      if (response?.status === 'success' && response.data) {
        this.ultimoEditor = response.data;
      }
    });
  }


  /**
   * Calcula el color del semáforo según los días transcurridos y el estatus
   */
  calcularColorSemaforo(dias: number, estatus: string): string {
    if (estatus === 'ATENDIDO') {
      if (dias <= 3) return 'verde';
      if (dias <= 7) return 'amarillo';
      return 'rojo';
    } else {
      // Para documentos no atendidos
      const hoy = new Date();
      const tiempoTranscurrido = this.tiempoRespuesta?.tiempo_transcurrido_dias || 0;

      if (tiempoTranscurrido <= 3) return 'verde';
      if (tiempoTranscurrido <= 7) return 'amarillo';
      return 'rojo';
    }
  }

  /**
   * Formatea fecha para mostrar
   */
  formatearFecha(fecha: string | Date | undefined | null): string {
    if (!fecha) return 'No disponible';
    return this.datePipe.transform(fecha, 'dd/MM/yyyy') || 'Fecha inválida';
  }

  /**
   * Formatea fecha con hora para mostrar
   */
  formatearFechaHora(fecha: string | Date | undefined | null): string {
    if (!fecha) return 'No disponible';
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') || 'Fecha inválida';
  }

  /**
   * Retorna una clase CSS para el chip de estatus
   */
  getEstatusClass(estatus: string | undefined): string {
    if (!estatus) return 'bg-gray-200 text-gray-800';

    switch(estatus.toUpperCase()) {
      case 'ATENDIDO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'NO ATENDIDO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EN PROCESO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }

  /**
   * Retorna una clase CSS para el semáforo
   */
  getSemaforoClass(semaforo: string | undefined): string {
    if (!semaforo) return 'bg-gray-500';

    switch(semaforo) {
      case 'verde':
        return 'bg-green-500';
      case 'amarillo':
        return 'bg-yellow-500';
      case 'rojo':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Navegación a pantalla de edición
   */
  irAEditar(): void {
    this.router.navigate(['/editar', this.id]);
  }

  /**
   * Navegación a pantalla de edición de seguimiento
   */
  irAEditarSeguimiento(): void {
    this.router.navigate(['/editar-seguimiento', this.id]);
  }

  /**
   * Formatea un nombre de usuario en formato CamelCase
   * @param username Nombre de usuario (ejemplo: "iliana.lopez")
   */
  formatUserName(username: string | undefined): string {
    if (!username) return 'No disponible';

    return username.split('.').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' ');
  }
}
