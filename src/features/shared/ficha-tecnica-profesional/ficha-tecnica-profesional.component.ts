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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { EstatusEnum } from '../../../core/models/enums/estatus.enum';
import { AreasEnum } from '../../../core/models/enums/areas.enum';

import { InputService } from '../../../core/services/api/input.service';
import { UserService } from '../../../core/services/api/user.service';
import { PdfService } from '../../../core/services/api/pdf.service';
import { AlertService } from '../../../core/services/ui/alert.service';
import { AuthService } from '../../../core/services/api/auth.service';
import { RolesEnum } from '../../../core/models/enums/roles.enum';

import { Input } from '../../../core/models/input/input.model';
import { User } from '../../../core/models/user.model';
import { Subject, Observable, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError, tap } from 'rxjs/operators';
import { DuplicatedDocument } from '../../../core/models/input/duplicate.model';

import Swal from 'sweetalert2';

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

  // Propiedades para visualización de fechas
  fecha_recepcion_display?: string;
  fecha_vencimiento_display?: string;
  tiempo_recepcion_display?: string;
  tiempo_respuesta_display?: string;

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
    MatExpansionModule,
    ReactiveFormsModule
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

  // Agregar propiedades para controlar permisos
  canEditInput: boolean = false;
  canEditSeguimiento: boolean = false;

  // Añadir estas propiedades a la clase
  inputForm: FormGroup = new FormGroup({});
  seguimientoForm: FormGroup = new FormGroup({});

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inputService: InputService,
    private userService: UserService,
    private pdfService: PdfService,
    private alertService: AlertService,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AuthService, // Agregar servicio de autenticación
    private fb: FormBuilder
  ) {
    // Inicializar formularios vacíos
    this.initForms();
  }

  ngOnInit(): void {
    // Verificar permisos iniciales
    this.canEditInput = this.isAdmin();
    this.canEditSeguimiento = true; // Todos los usuarios registrados pueden editar seguimiento

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

          // Procesar fechas para visualización correcta
          const inputData = response.input;

          // Crear propiedades para fechas correctamente formateadas
          inputData.fecha_oficio_display = this.formatearFechaCorrecta(inputData.fecha_oficio);
          inputData.fecha_recepcion_display = this.formatearFechaCorrecta(inputData.fecha_recepcion);
          inputData.fecha_vencimiento_display = this.formatearFechaCorrecta(inputData.fecha_vencimiento);

          // Si hay datos de seguimiento, procesar esas fechas también
          if (inputData.seguimientos) {
            inputData.seguimientos.fecha_oficio_salida_display =
              this.formatearFechaCorrecta(inputData.seguimientos.fecha_oficio_salida);
            inputData.seguimientos.fecha_acuse_recibido_display =
              this.formatearFechaCorrecta(inputData.seguimientos.fecha_acuse_recibido);
          }

          this.inputDetails = inputData;
          return inputData;
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

    // Usando el PdfService para obtener todos los PDFs
    this.pdfService.getAllInputPdfs(this.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error al cargar lista de PDFs:', error);
        this.errorPdfEntrada = 'Error al obtener la lista de archivos.';
        this.loadingPdfs = false;
        return of({ data: { principales: [], seguimiento: [] } });
      }),
      switchMap(result => {
        if (!result?.data) {
          return of(null);
        }

        const { principales, seguimiento } = result.data;

        // Crear arrays para almacenar observables de URLs
        const principalUrlObservables: Observable<{ name: string, url: string }>[] = [];
        const seguimientoUrlObservables: Observable<{ name: string, url: string }>[] = [];

        // Generar observables para PDFs principales
        principales.forEach(pdf => {
          if (pdf.exists) {
            principalUrlObservables.push(
              this.pdfService.getPdfUrl(this.id, pdf.name, false).pipe(
                map(url => ({ name: pdf.name, url }))
              )
            );
          }
        });

        // Generar observables para PDFs de seguimiento
        seguimiento.forEach(pdf => {
          if (pdf.exists) {
            seguimientoUrlObservables.push(
              this.pdfService.getPdfUrl(this.id, pdf.name, true).pipe(
                map(url => ({ name: pdf.name, url }))
              )
            );
          }
        });

        // Combinar observables de PDFs principales
        const principalPdfs$ = principalUrlObservables.length > 0
          ? forkJoin(principalUrlObservables)
          : of([]);

        // Combinar observables de PDFs de seguimiento
        const seguimientoPdfs$ = seguimientoUrlObservables.length > 0
          ? forkJoin(seguimientoUrlObservables)
          : of([]);

        // Devolver ambos grupos de PDFs cuando todos se hayan cargado
        return forkJoin({
          principales: principalPdfs$,
          seguimiento: seguimientoPdfs$
        });
      })
    ).subscribe({
      next: (result) => {
        if (!result) {
          this.loadingPdfs = false;
          return;
        }

        // Procesar URLs principales
        result.principales.forEach(item => {
          this.pdfFilenames.push(item.name);
          this.pdfUrls.push(this.sanitizer.bypassSecurityTrustUrl(item.url));
        });

        // Procesar URLs de seguimiento
        result.seguimiento.forEach(item => {
          this.pdfFilenamesSeguimiento.push(item.name);
          this.pdfUrlsSeguimiento.push(this.sanitizer.bypassSecurityTrustUrl(item.url));
        });

        this.pdfsCargados = true;
        this.loadingPdfs = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al procesar PDFs:', error);
        this.loadingPdfs = false;
        this.alertService.error('Ocurrió un error al cargar los archivos PDF');
        this.cdr.detectChanges();
      }
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
   * Formatea una fecha correctamente compensando la zona horaria
   * @param fecha Fecha a formatear
   * @param formato Formato a aplicar (por defecto: 'dd/MM/yyyy')
   * @returns Fecha formateada correctamente
   */
  formatearFechaCorrecta(fecha: string | Date | undefined | null, formato: string = 'dd/MM/yyyy'): string {
    if (!fecha) return 'No disponible';

    // Convertir a objeto Date si es string
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;

    // Obtener componentes de la fecha en UTC para evitar conversión automática de zona horaria
    const year = fechaObj.getUTCFullYear();
    const month = fechaObj.getUTCMonth();
    const day = fechaObj.getUTCDate();

    // Crear una nueva fecha con estos componentes sin conversión de zona horaria
    const fechaLocal = new Date();
    fechaLocal.setFullYear(year, month, day);

    // Aplicar el formato utilizando el DatePipe de Angular
    return this.datePipe.transform(fechaLocal, formato) || 'Fecha inválida';
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
   * Comprueba si el usuario actual tiene permisos de administrador
   */
  isAdmin(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.roles === RolesEnum.ADMIN;
  }

  /**
   * Navegación a pantalla de edición con confirmación previa
   */
  irAEditar(): void {
    // Verificar permisos de administrador
    if (!this.isAdmin()) {
      this.alertService.error('No tienes permisos para editar este documento');
      return;
    }

    Swal.fire({
      title: 'Editar Documento',
      html: `
        <div class="text-left">
          <p class="mb-4 text-gray-700">Estás a punto de editar el documento:</p>
          <div class="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400 mb-4">
            <p class="text-sm font-medium">Folio: <span class="font-bold">${this.inputDetails?.anio}-${this.inputDetails?.folio}</span></p>
            <p class="text-sm font-medium">Oficio: <span class="font-bold">${this.inputDetails?.num_oficio}</span></p>
          </div>
          <p class="text-sm text-gray-600">Los cambios que realices afectarán la información principal del documento.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="material-icons mr-1">edit</i> Continuar con la edición',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'swal-wide',
        title: 'text-lg font-medium text-gray-800',
        htmlContainer: 'text-left'
      },
      backdrop: `rgba(0,0,30,0.4)`
    }).then((result) => {
      if (result.isConfirmed) {
        this.mostrarFormularioEdicion();
      }
    });
  }

  /**
   * Muestra el formulario de edición del documento principal
   */
  mostrarFormularioEdicion(): void {
    // Clave única para localStorage basada en el ID del documento
    const storageKey = `cg_edit_doc_${this.id}`;

    // Intentar recuperar datos guardados previamente
    const savedData = localStorage.getItem(storageKey);
    const formData = savedData ? JSON.parse(savedData) : null;

    // Usar datos guardados si existen, o los datos actuales del documento
    const initialData = formData || {
      num_oficio: this.inputDetails?.num_oficio || '',
      fecha_oficio: this.formatDateForInput(this.inputDetails?.fecha_oficio),
      fecha_vencimiento: this.formatDateForInput(this.inputDetails?.fecha_vencimiento),
      fecha_recepcion: this.formatDateForInput(this.inputDetails?.fecha_recepcion),
      hora_recepcion: this.inputDetails?.hora_recepcion || '',
      instrumento_juridico: this.inputDetails?.instrumento_juridico || '',
      remitente: this.inputDetails?.remitente || '',
      institucion_origen: this.inputDetails?.institucion_origen || '',
      asunto: this.inputDetails?.asunto || '',
      asignado: this.inputDetails?.asignado || '',
      estatus: this.inputDetails?.estatus || 'NO ATENDIDO',
      observacion: this.inputDetails?.observacion || '',
      archivosPdf: this.inputDetails?.archivosPdf || []
    };

    // Actualizar el formulario con los datos iniciales
    this.inputForm.patchValue(initialData);

    // Opciones para los campos select
    const areaOptions = Object.values(AreasEnum)
      .map(area => `<option value="${area}" ${initialData.asignado === area ? 'selected' : ''}>${area}</option>`)
      .join('');

    const estatusOptions = Object.values(EstatusEnum)
      .map(estatus => `<option value="${estatus}" ${initialData.estatus === estatus ? 'selected' : ''}>${estatus}</option>`)
      .join('');

    // Preparar rutas de PDFs para mostrar
    let pdfRutas = initialData.archivosPdf || [];
    if (!pdfRutas.length) {
      pdfRutas = [''];  // Al menos un campo vacío si no hay rutas
    }

    const pdfFields = pdfRutas.map((ruta: any, index: number) => `
      <div class="flex items-center mb-2 pdf-input-group" id="pdf-group-${index}">
        <input id="swal-input-pdf-${index}" class="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value="${ruta || ''}" placeholder="\\\\ws\\Control_Gestion_pdfs\\DIRECCIÓN\\AÑO\\MES\\archivo.pdf">
        ${index > 0 ? `
          <button type="button" class="remove-pdf-btn ml-2 px-2 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ` : ''}
      </div>
    `).join('');

    // Mostrar SweetAlert con el formulario - incluyendo la sección de PDFs
    Swal.fire({
      title: 'Editar Documento',
      html: `
        <form id="editDocForm" class="text-left">
          <!-- Número de oficio y fecha de oficio -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-num_oficio">Número de Oficio*</label>
              <input id="swal-input-num_oficio" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.num_oficio}" placeholder="Ej: CJ/DG/123/2023" required>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha_oficio">Fecha de Oficio*</label>
              <input id="swal-input-fecha_oficio" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.fecha_oficio}" required>
            </div>
          </div>

          <!-- Recepción -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha_recepcion">Fecha de Recepción*</label>
              <input id="swal-input-fecha_recepcion" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.fecha_recepcion}" required>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-hora_recepcion">Hora de Recepción</label>
              <input id="swal-input-hora_recepcion" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.hora_recepcion}" placeholder="Ej. 10:30 AM">
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha_vencimiento">Fecha de Vencimiento</label>
              <input id="swal-input-fecha_vencimiento" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.fecha_vencimiento}">
            </div>
          </div>

          <!-- Remitente e institución -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-remitente">Remitente*</label>
              <input id="swal-input-remitente" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.remitente}" required>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-institucion_origen">Institución de Origen</label>
              <input id="swal-input-institucion_origen" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.institucion_origen}">
            </div>
          </div>

          <!-- Instrumento jurídico -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-instrumento_juridico">Instrumento Jurídico</label>
            <input id="swal-input-instrumento_juridico" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value="${initialData.instrumento_juridico}">
          </div>

          <!-- Área y estatus -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-asignado">Área Asignada*</label>
              <select id="swal-input-asignado" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                ${areaOptions}
              </select>
            </div>
          </div>

          <!-- Asunto -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-asunto">Asunto*</label>
            <textarea id="swal-input-asunto" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="4" required>${initialData.asunto}</textarea>
          </div>

          <!-- Sección de archivos PDF -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Rutas de Archivos PDF</label>
            <div id="pdf-container">
              ${pdfFields}
            </div>
            <button type="button" id="add-pdf-btn" class="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Agregar otra ruta de PDF
            </button>
            <p class="text-xs text-gray-500 mt-1">Ingrese rutas completas a los archivos PDF (ej: \\\\ws\\Control_Gestion_pdfs\\DIRECCION\\2025\\03\\archivo.pdf)</p>
          </div>

          <!-- Observación - ahora aparece después de la sección de PDFs -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-observacion">Observación</label>
            <textarea id="swal-input-observacion" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="3">${initialData.observacion}</textarea>
          </div>

          <div class="text-xs text-gray-500 mb-3">* Campos obligatorios</div>
        </form>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'swal-wide',
        popup: 'swal-wide',
        title: 'text-lg font-medium text-gray-800',
        htmlContainer: 'text-left max-h-[75vh] overflow-y-auto'
      },
      didOpen: () => {
        // Función para guardar los valores del formulario en localStorage
        const saveFormData = () => {
          const formData = {
            num_oficio: (document.getElementById('swal-input-num_oficio') as HTMLInputElement).value,
            fecha_oficio: (document.getElementById('swal-input-fecha_oficio') as HTMLInputElement).value,
            fecha_recepcion: (document.getElementById('swal-input-fecha_recepcion') as HTMLInputElement).value,
            fecha_vencimiento: (document.getElementById('swal-input-fecha_vencimiento') as HTMLInputElement).value,
            hora_recepcion: (document.getElementById('swal-input-hora_recepcion') as HTMLInputElement).value,
            instrumento_juridico: (document.getElementById('swal-input-instrumento_juridico') as HTMLInputElement).value,
            remitente: (document.getElementById('swal-input-remitente') as HTMLInputElement).value,
            institucion_origen: (document.getElementById('swal-input-institucion_origen') as HTMLInputElement).value,
            asunto: (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value,
            asignado: (document.getElementById('swal-input-asignado') as HTMLSelectElement).value,
            estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
            observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value,
            archivosPdf: Array.from(document.querySelectorAll('[id^="swal-input-pdf-"]'))
              .map(input => (input as HTMLInputElement).value)
              .filter(Boolean)
          };
          localStorage.setItem(storageKey, JSON.stringify(formData));
        };

        // Agregar listeners para guardar datos en cambios
        const formInputs = document.querySelectorAll('#editDocForm input, #editDocForm textarea, #editDocForm select');
        formInputs.forEach(input => {
          input.addEventListener('change', saveFormData);
          input.addEventListener('blur', saveFormData);
        });

        // Añadir el event listener al botón después de que el modal está abierto
        document.getElementById('add-pdf-btn')?.addEventListener('click', function() {
          const container = document.getElementById('pdf-container');
          if (!container) return;

          const newIndex = container.children.length;
          const newGroup = document.createElement('div');
          newGroup.className = 'flex items-center mb-2 pdf-input-group';
          newGroup.id = 'pdf-group-' + newIndex;

          newGroup.innerHTML = `
            <input id="swal-input-pdf-${newIndex}" class="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value="" placeholder="\\\\ws\\Control_Gestion_pdfs\\DIRECCIÓN\\AÑO\\MES\\archivo.pdf">
            <button type="button" class="remove-pdf-btn ml-2 px-2 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          `;

          container.appendChild(newGroup);

          // Agregar evento al botón de eliminar recién creado
          const removeBtn = newGroup.querySelector('.remove-pdf-btn');
          removeBtn?.addEventListener('click', function() {
            newGroup.remove();
            // Guardar el estado después de eliminar un campo
            const saveFormData = () => {
              const formData = {
                num_oficio: (document.getElementById('swal-input-num_oficio') as HTMLInputElement).value,
                fecha_oficio: (document.getElementById('swal-input-fecha_oficio') as HTMLInputElement).value,
                fecha_recepcion: (document.getElementById('swal-input-fecha_recepcion') as HTMLInputElement).value,
                fecha_vencimiento: (document.getElementById('swal-input-fecha_vencimiento') as HTMLInputElement).value,
                hora_recepcion: (document.getElementById('swal-input-hora_recepcion') as HTMLInputElement).value,
                instrumento_juridico: (document.getElementById('swal-input-instrumento_juridico') as HTMLInputElement).value,
                remitente: (document.getElementById('swal-input-remitente') as HTMLInputElement).value,
                institucion_origen: (document.getElementById('swal-input-institucion_origen') as HTMLInputElement).value,
                asunto: (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value,
                asignado: (document.getElementById('swal-input-asignado') as HTMLSelectElement).value,
                estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
                observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value,
                archivosPdf: Array.from(document.querySelectorAll('[id^="swal-input-pdf-"]')).map(input => (input as HTMLInputElement).value).filter(Boolean)
              };
              localStorage.setItem(storageKey, JSON.stringify(formData));
            };
            saveFormData();
          });

          // Agregar evento al nuevo campo para guardar al cambiar
          const newInput = newGroup.querySelector('[id^="swal-input-pdf-"]');
          newInput?.addEventListener('change', () => {
            const saveFormData = () => {
              const formData = {
                num_oficio: (document.getElementById('swal-input-num_oficio') as HTMLInputElement).value,
                fecha_oficio: (document.getElementById('swal-input-fecha_oficio') as HTMLInputElement).value,
                fecha_recepcion: (document.getElementById('swal-input-fecha_recepcion') as HTMLInputElement).value,
                fecha_vencimiento: (document.getElementById('swal-input-fecha_vencimiento') as HTMLInputElement).value,
                hora_recepcion: (document.getElementById('swal-input-hora_recepcion') as HTMLInputElement).value,
                instrumento_juridico: (document.getElementById('swal-input-instrumento_juridico') as HTMLInputElement).value,
                remitente: (document.getElementById('swal-input-remitente') as HTMLInputElement).value,
                institucion_origen: (document.getElementById('swal-input-institucion_origen') as HTMLInputElement).value,
                asunto: (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value,
                asignado: (document.getElementById('swal-input-asignado') as HTMLSelectElement).value,
                estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
                observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value,
                archivosPdf: Array.from(document.querySelectorAll('[id^="swal-input-pdf-"]')).map(input => (input as HTMLInputElement).value).filter(Boolean)
              };
              localStorage.setItem(storageKey, JSON.stringify(formData));
            };
            saveFormData();
          });
        });

        // Configurar event listeners para botones de eliminar PDFs
        document.querySelectorAll('.remove-pdf-btn').forEach(button => {
          button.addEventListener('click', function(this: HTMLElement) {
            const group = this.closest('.pdf-input-group');
            group?.remove();

            // Guardar después de eliminar un campo
            const saveFormData = () => {
              const formData = {
                num_oficio: (document.getElementById('swal-input-num_oficio') as HTMLInputElement).value,
                fecha_oficio: (document.getElementById('swal-input-fecha_oficio') as HTMLInputElement).value,
                fecha_recepcion: (document.getElementById('swal-input-fecha_recepcion') as HTMLInputElement).value,
                fecha_vencimiento: (document.getElementById('swal-input-fecha_vencimiento') as HTMLInputElement).value,
                hora_recepcion: (document.getElementById('swal-input-hora_recepcion') as HTMLInputElement).value,
                instrumento_juridico: (document.getElementById('swal-input-instrumento_juridico') as HTMLInputElement).value,
                remitente: (document.getElementById('swal-input-remitente') as HTMLInputElement).value,
                institucion_origen: (document.getElementById('swal-input-institucion_origen') as HTMLInputElement).value,
                asunto: (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value,
                asignado: (document.getElementById('swal-input-asignado') as HTMLSelectElement).value,
                estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
                observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value,
                archivosPdf: Array.from(document.querySelectorAll('[id^="swal-input-pdf-"]')).map(input => (input as HTMLInputElement).value).filter(Boolean)
              };
              localStorage.setItem(storageKey, JSON.stringify(formData));
            };
            saveFormData();
          });
        });
      },
      preConfirm: () => {
        // Validar campos obligatorios
        const numOficio = (document.getElementById('swal-input-num_oficio') as HTMLInputElement).value;
        const fechaOficio = (document.getElementById('swal-input-fecha_oficio') as HTMLInputElement).value;
        const fechaRecepcion = (document.getElementById('swal-input-fecha_recepcion') as HTMLInputElement).value;
        const remitente = (document.getElementById('swal-input-remitente') as HTMLInputElement).value;
        const asunto = (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value;
        const asignado = (document.getElementById('swal-input-asignado') as HTMLSelectElement).value;

        if (!numOficio || !fechaOficio || !fechaRecepcion || !remitente || !asunto || !asignado) {
          Swal.showValidationMessage('Por favor complete todos los campos obligatorios');
          return false;
        }

        // Recopilar rutas de PDFs
        const pdfInputs = Array.from(document.querySelectorAll('[id^="swal-input-pdf-"]'));
        const pdfRutas = pdfInputs.map(input => (input as HTMLInputElement).value.trim()).filter(Boolean);

        // Recopilar todos los valores del formulario
        return {
          num_oficio: numOficio,
          fecha_oficio: fechaOficio,
          fecha_recepcion: fechaRecepcion,
          hora_recepcion: (document.getElementById('swal-input-hora_recepcion') as HTMLInputElement).value,
          fecha_vencimiento: (document.getElementById('swal-input-fecha_vencimiento') as HTMLInputElement).value,
          instrumento_juridico: (document.getElementById('swal-input-instrumento_juridico') as HTMLInputElement).value,
          remitente: remitente,
          institucion_origen: (document.getElementById('swal-input-institucion_origen') as HTMLInputElement).value,
          asunto: asunto,
          asignado: asignado,
          estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
          observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value,
          archivosPdf: pdfRutas
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.guardarEdicionDocumento(result.value);
        // Limpiar localStorage después de guardar exitosamente
        localStorage.removeItem(storageKey);
      }
    });
  }

  /**
   * Guarda los cambios del documento principal
   */
  guardarEdicionDocumento(formData: any): void {
    const storageKey = `cg_edit_doc_${this.id}`;

    // Mostrar indicador de carga
    Swal.fire({
      title: 'Guardando cambios...',
      html: 'Por favor espere mientras se actualiza la información',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Función para ajustar la fecha al formato UTC+0 con hora 06:00
    const ajustarFechaUTC = (fechaStr: string): string => {
      if (!fechaStr) return '';

      // Crear fecha a partir del string
      const fecha = new Date(fechaStr);

      // Establecer la hora a las 6:00 AM UTC (corresponde a medianoche en UTC-6)
      fecha.setUTCHours(6, 0, 0, 0);

      // Retornar en formato ISO
      return fecha.toISOString();
    };

    // Construir el objeto de actualización preservando los seguimientos existentes
    const inputUpdate = {
      ...formData,
      _id: this.inputDetails?._id,
      fecha_oficio: ajustarFechaUTC(formData.fecha_oficio),
      fecha_recepcion: ajustarFechaUTC(formData.fecha_recepcion),
      fecha_vencimiento: ajustarFechaUTC(formData.fecha_vencimiento),
      // Preservar el seguimiento existente si existe
      seguimientos: this.inputDetails?.seguimientos ? { ...this.inputDetails.seguimientos } : undefined
    };

    // Realizar la actualización a través del servicio
    this.inputService.updateInput(this.id, inputUpdate).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          // Limpiar datos guardados en localStorage
          localStorage.removeItem(storageKey);

          // Actualizar el estado local con los datos actualizados
          if (response.data) {
            this.inputDetails = response.data;
          }

          // Mostrar mensaje de éxito
          Swal.fire({
            title: '¡Actualizado!',
            text: 'El documento se actualizó correctamente',
            icon: 'success',
            confirmButtonColor: '#3085d6'
          });

          // Recargar los datos para mostrar la información actualizada
          this.loadInputDetails().subscribe();
        } else {
          // Manejar respuesta inesperada
          Swal.fire({
            title: 'Advertencia',
            text: 'La operación se completó pero hubo un problema al actualizar los datos locales',
            icon: 'warning',
            confirmButtonColor: '#3085d6'
          });
        }
      },
      error: (error) => {
        console.error('Error al actualizar el documento:', error);

        // Mostrar mensaje de error
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'Hubo un error al guardar los cambios. Inténtelo nuevamente.',
          icon: 'error',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  /**
   * Navegación a pantalla de edición de seguimiento con confirmación previa
   */
  irAEditarSeguimiento(): void {
    // Verificar si el documento tiene un seguimiento asociado
    if (!this.inputDetails?.seguimientos) {
      this.alertService.error('Este documento no tiene seguimiento. El seguimiento debe crearse desde el registro de entrada.');
      return;
    }

    // Construir mensaje para edición de seguimiento
    const alertaAdicional = this.inputDetails?.estatus === 'ATENDIDO'
      ? `
        <div class="bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400 mt-4">
          <p class="text-sm font-medium text-yellow-800">
            <i class="material-icons text-yellow-600 align-text-bottom text-sm">warning</i>
            Este documento está marcado como "ATENDIDO". Realizar cambios podría afectar a reportes o estadísticas.
          </p>
        </div>
      ` : '';

    Swal.fire({
      title: 'Editar Seguimiento',
      html: `
        <div class="text-left">
          <p class="mb-4 text-gray-700">Estás a punto de editar el seguimiento del documento:</p>
          <div class="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400 mb-4">
            <p class="text-sm font-medium">Folio: <span class="font-bold">${this.inputDetails?.folio}</span></p>
            <p class="text-sm font-medium">Oficio: <span class="font-bold">${this.inputDetails?.num_oficio}</span></p>
            <p class="text-sm font-medium">Área asignada: <span class="font-bold">${this.inputDetails?.asignado}</span></p>
          </div>
          ${alertaAdicional}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `<i class="material-icons mr-1">edit</i> Continuar`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'swal-wide',
        title: 'text-lg font-medium text-gray-800',
        htmlContainer: 'text-left'
      },
      backdrop: `rgba(0,0,30,0.4)`
    }).then((result) => {
      if (result.isConfirmed) {
        this.mostrarFormularioSeguimiento();
      }
    });
  }

  /**
   * Muestra el formulario para editar el seguimiento
   */
  mostrarFormularioSeguimiento(): void {
    // Clave única para localStorage basada en el ID del documento
    const storageKey = `cg_edit_seg_${this.id}`;

    // Intentar recuperar datos guardados previamente
    const savedData = localStorage.getItem(storageKey);
    const formData = savedData ? JSON.parse(savedData) : null;

    // Variables para almacenar campos PDF y opciones de estatus
    let pdfFields = '';
    let estatusOptions = '';

    // Preparar datos iniciales del formulario (guardados o actuales)
    let initialData: any = {};

    // Determinar qué datos usar: guardados o actuales
    if (formData) {
      // Usar datos guardados si existen
      initialData = formData;
    } else if (this.inputDetails?.seguimientos) {
      // Usar datos actuales del seguimiento
      initialData = {
        num_expediente: this.inputDetails.seguimientos.num_expediente || '',
        oficio_salida: this.inputDetails.seguimientos.oficio_salida || '',
        fecha_oficio_salida: this.formatDateForInput(this.inputDetails.seguimientos.fecha_oficio_salida),
        fecha_acuse_recibido: this.formatDateForInput(this.inputDetails.seguimientos.fecha_acuse_recibido),
        destinatario: this.inputDetails.seguimientos.destinatario || '',
        cargo: this.inputDetails.seguimientos.cargo || '',
        atencion_otorgada: this.inputDetails.seguimientos.atencion_otorgada || '',
        anexo: this.inputDetails.seguimientos.anexo || '',
        estatus: this.inputDetails.estatus || 'NO ATENDIDO',
        firma_visado: this.inputDetails.seguimientos.firma_visado || '',
        comentarios: this.inputDetails.seguimientos.comentarios || '',
        archivosPdf_seguimiento: this.inputDetails.seguimientos.archivosPdf_seguimiento || []
      };
    } else {
      // Reset del formulario si no hay datos
      this.seguimientoForm.reset();
      return;
    }

    // Actualizar el formulario con los datos iniciales
    this.seguimientoForm.patchValue(initialData);

    // Preparar rutas de PDFs para mostrar
    let pdfRutas = initialData.archivosPdf_seguimiento || [];
    if (!pdfRutas.length) {
      pdfRutas = [''];  // Al menos un campo vacío si no hay rutas
    }

    // Crear los campos de PDF dinámicos
    pdfFields = pdfRutas.map((ruta: string, index: number) => `
      <div class="flex items-center mb-2 pdf-seguimiento-group" id="pdf-seg-group-${index}">
        <input id="swal-input-pdf-seg-${index}" class="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value="${ruta || ''}" placeholder="\\\\ws\\Control_Gestion_pdfs\\DIRECCIÓN\\AÑO\\MES\\archivo.pdf">
        ${index > 0 ? `
          <button type="button" class="remove-pdf-seg-btn ml-2 px-2 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ` : ''}
      </div>
    `).join('');

    // Opciones para el campo select de estatus
    estatusOptions = Object.values(EstatusEnum)
      .map(estatus => `<option value="${estatus}" ${initialData.estatus === estatus ? 'selected' : ''}>${estatus}</option>`)
      .join('');

    // Mostrar formulario con clases CSS actualizadas para mayor ancho
    Swal.fire({
      title: 'Editar Seguimiento',
      html: `
        <form id="editSeguimientoForm" class="text-left">
          <!-- Número de expediente y oficio de salida -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-num_expediente">Número de Expediente</label>
              <input id="swal-input-num_expediente" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.num_expediente}">
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-oficio_salida">Oficio de Salida*</label>
              <input id="swal-input-oficio_salida" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.oficio_salida}" required>
            </div>
          </div>

          <!-- Fechas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha_oficio_salida">Fecha Oficio Salida</label>
              <input id="swal-input-fecha_oficio_salida" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.fecha_oficio_salida}">
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha_acuse_recibido">Fecha Acuse*</label>
              <input id="swal-input-fecha_acuse_recibido" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.fecha_acuse_recibido}" required>
            </div>
          </div>

          <!-- Destinatario y cargo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-destinatario">Destinatario*</label>
              <input id="swal-input-destinatario" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.destinatario}" required>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-cargo">Cargo*</label>
              <input id="swal-input-cargo" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.cargo}" required>
            </div>
          </div>

          <!-- Estatus (campo obligatorio) -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-estatus">Estatus*</label>
            <select id="swal-input-estatus" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              ${estatusOptions}
            </select>
          </div>

          <!-- Atención otorgada -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-atencion_otorgada">Respuesta / Atención Otorgada*</label>
            <textarea id="swal-input-atencion_otorgada" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="3" required>${initialData.atencion_otorgada}</textarea>
          </div>

          <!-- Opciones adicionales como campos de texto libre (no obligatorios) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-anexo">Anexos</label>
              <input id="swal-input-anexo" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.anexo}" placeholder="Ej: SI, NO, Formato PDF, etc.">
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-firma_visado">Firma</label>
              <input id="swal-input-firma_visado" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value="${initialData.firma_visado}" placeholder="Ej: SI, NO, En trámite, etc.">
            </div>
          </div>

          <!-- Sección de archivos PDF para seguimiento -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Rutas de Archivos PDF (Seguimiento)</label>
            <div id="pdf-seguimiento-container">
              ${pdfFields}
            </div>
            <button type="button" id="add-pdf-seg-btn" class="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Agregar otra ruta de PDF
            </button>
            <p class="text-xs text-gray-500 mt-1">Ingrese rutas completas a los archivos PDF (ej: \\\\ws\\Control_Gestion_pdfs\\DIRECCION\\2025\\03\\archivo.pdf)</p>
          </div>

          <!-- Comentarios - ahora aparece después de la sección de PDFs -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-comentarios">Observaciones</label>
            <textarea id="swal-input-comentarios" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="2">${initialData.comentarios || ''}</textarea>
          </div>

          <div class="text-xs text-gray-500 mb-3">* Campos obligatorios</div>
        </form>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      customClass: {
        container: 'swal-wide',
        popup: 'swal-wide',
        title: 'text-lg font-medium text-gray-800',
        htmlContainer: 'text-left max-h-[75vh] overflow-y-auto'
      },
      didOpen: () => {
        // Función para guardar los valores del formulario en localStorage
        const saveFormData = () => {
          const formData = {
            num_expediente: (document.getElementById('swal-input-num_expediente') as HTMLInputElement).value,
            oficio_salida: (document.getElementById('swal-input-oficio_salida') as HTMLInputElement).value,
            fecha_oficio_salida: (document.getElementById('swal-input-fecha_oficio_salida') as HTMLInputElement).value,
            fecha_acuse_recibido: (document.getElementById('swal-input-fecha_acuse_recibido') as HTMLInputElement).value,
            destinatario: (document.getElementById('swal-input-destinatario') as HTMLInputElement).value,
            cargo: (document.getElementById('swal-input-cargo') as HTMLInputElement).value,
            atencion_otorgada: (document.getElementById('swal-input-atencion_otorgada') as HTMLTextAreaElement).value,
            anexo: (document.getElementById('swal-input-anexo') as HTMLInputElement).value,
            estatus: (document.getElementById('swal-input-estatus') as HTMLSelectElement).value,
            firma_visado: (document.getElementById('swal-input-firma_visado') as HTMLInputElement).value,
            comentarios: (document.getElementById('swal-input-comentarios') as HTMLTextAreaElement).value,
            archivosPdf_seguimiento: Array.from(document.querySelectorAll('[id^="swal-input-pdf-seg-"]'))
              .map(input => (input as HTMLInputElement).value)
              .filter(Boolean)
          };
          localStorage.setItem(storageKey, JSON.stringify(formData));
        };

        // Agregar listeners para guardar datos en cambios
        const formInputs = document.querySelectorAll('#editSeguimientoForm input, #editSeguimientoForm textarea, #editSeguimientoForm select');
        formInputs.forEach(input => {
          input.addEventListener('change', saveFormData);
          input.addEventListener('blur', saveFormData);
        });

        // Añadir el event listener al botón después de que el modal está abierto
        document.getElementById('add-pdf-seg-btn')?.addEventListener('click', function() {
          const container = document.getElementById('pdf-seguimiento-container');
          if (!container) return;

          const newIndex = container.children.length;
          const newGroup = document.createElement('div');
          newGroup.className = 'flex items-center mb-2 pdf-seguimiento-group';
          newGroup.id = 'pdf-seg-group-' + newIndex;

          newGroup.innerHTML = `
            <input id="swal-input-pdf-seg-${newIndex}" class="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value="" placeholder="\\\\ws\\Control_Gestion_pdfs\\DIRECCIÓN\\AÑO\\MES\\archivo.pdf">
            <button type="button" class="remove-pdf-seg-btn ml-2 px-2 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          `;

          container.appendChild(newGroup);

          // Agregar evento al botón de eliminar recién creado
          const removeBtn = newGroup.querySelector('.remove-pdf-seg-btn');
          removeBtn?.addEventListener('click', function() {
            newGroup.remove();
          });
        });

        // Agregar event listeners a los botones de eliminar iniciales
        document.querySelectorAll('.remove-pdf-seg-btn').forEach(button => {
          button.addEventListener('click', function(this: HTMLElement) {
            const group = this.closest('.pdf-seguimiento-group');
            group?.remove();
          });
        });
      },
      preConfirm: () => {
        // Validar campos obligatorios
        const oficioSalida = (document.getElementById('swal-input-oficio_salida') as HTMLInputElement).value;
        const fechaAcuse = (document.getElementById('swal-input-fecha_acuse_recibido') as HTMLInputElement).value;
        const destinatario = (document.getElementById('swal-input-destinatario') as HTMLInputElement).value;
        const cargo = (document.getElementById('swal-input-cargo') as HTMLInputElement).value;
        const atencionOtorgada = (document.getElementById('swal-input-atencion_otorgada') as HTMLTextAreaElement).value;
        const estatus = (document.getElementById('swal-input-estatus') as HTMLSelectElement).value;

        if (!oficioSalida || !fechaAcuse || !destinatario || !cargo || !atencionOtorgada || !estatus) {
          Swal.showValidationMessage('Por favor complete todos los campos obligatorios');
          return false;
        }

        // Recopilar rutas de PDFs
        const pdfInputs = Array.from(document.querySelectorAll('[id^="swal-input-pdf-seg-"]'));
        const pdfRutas = pdfInputs.map(input => (input as HTMLInputElement).value.trim()).filter(Boolean);

        // Recopilar todos los valores del formulario
        return {
          num_expediente: (document.getElementById('swal-input-num_expediente') as HTMLInputElement).value,
          oficio_salida: oficioSalida,
          fecha_oficio_salida: (document.getElementById('swal-input-fecha_oficio_salida') as HTMLInputElement).value,
          fecha_acuse_recibido: fechaAcuse,
          destinatario: destinatario,
          cargo: cargo,
          atencion_otorgada: atencionOtorgada,
          anexo: (document.getElementById('swal-input-anexo') as HTMLInputElement).value,
          firma_visado: (document.getElementById('swal-input-firma_visado') as HTMLInputElement).value,
          comentarios: (document.getElementById('swal-input-comentarios') as HTMLTextAreaElement).value,
          estatus: estatus,
          archivosPdf_seguimiento: pdfRutas
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.guardarSeguimiento(result.value);
        // Limpiar localStorage después de guardar exitosamente
        localStorage.removeItem(storageKey);
      }
    });
  }

  /**
   * Guarda los cambios del seguimiento
   */
  guardarSeguimiento(formData: any): void {
    // Mostrar indicador de carga
    Swal.fire({
      title: 'Guardando cambios...',
      html: 'Por favor espere mientras se actualiza la información',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Función para ajustar la fecha al formato UTC+0 con hora 06:00
    const ajustarFechaUTC = (fechaStr: string): string => {
      if (!fechaStr) return '';

      // Crear fecha a partir del string
      const fecha = new Date(fechaStr);

      // Establecer la hora a las 6:00 AM UTC (corresponde a medianoche en UTC-6)
      fecha.setUTCHours(6, 0, 0, 0);

      // Retornar en formato ISO
      return fecha.toISOString();
    };

    // Preparamos la estructura para actualización con la API real
    // La API espera que los datos de seguimiento estén dentro de seguimientos
    const updateData = {
      seguimientos: {
        ...formData,
        fecha_oficio_salida: ajustarFechaUTC(formData.fecha_oficio_salida),
        fecha_acuse_recibido: ajustarFechaUTC(formData.fecha_acuse_recibido),
        // Mantenemos el ID del seguimiento
        _id: this.inputDetails?.seguimientos?._id
      },
      // Actualizamos el estatus del documento principal con el seleccionado por el usuario
      estatus: formData.estatus
    };

    // Usar updateInput directamente, ya que no hay endpoints específicos para seguimientos
    this.inputService.updateInput(this.id, updateData).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          // Actualizar el estado local con los datos actualizados
          if (response.data) {
            this.inputDetails = response.data;
          }

          // Mostrar mensaje de éxito
          Swal.fire({
            title: '¡Guardado!',
            text: 'El seguimiento se actualizó correctamente',
            icon: 'success',
            confirmButtonColor: '#3085d6'
          });

          // Recargar los datos para mostrar la información actualizada
          this.loadInputDetails().subscribe();
        } else {
          // Manejar respuesta inesperada
          Swal.fire({
            title: 'Advertencia',
            text: 'La operación se completó pero hubo un problema al actualizar los datos locales',
            icon: 'warning',
            confirmButtonColor: '#3085d6'
          });
        }
      },
      error: (error) => {
        console.error('Error al guardar el seguimiento:', error);

        // Mostrar mensaje de error
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'Hubo un error al guardar los cambios. Inténtelo nuevamente.',
          icon: 'error',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  // Método para inicializar formularios
  initForms(): void {
    // Formulario para documento principal
    this.inputForm = this.fb.group({
      num_oficio: ['', Validators.required],
      fecha_oficio: ['', Validators.required],
      fecha_vencimiento: [''],
      fecha_recepcion: ['', Validators.required],
      hora_recepcion: [''],
      instrumento_juridico: [''],
      remitente: ['', Validators.required],
      institucion_origen: [''],
      asunto: ['', Validators.required],
      asignado: ['', Validators.required],
      estatus: ['NO ATENDIDO', Validators.required],
      observacion: ['']
    });

    // Formulario para seguimiento - actualizado según los campos obligatorios
    this.seguimientoForm = this.fb.group({
      num_expediente: [''], // No obligatorio
      oficio_salida: ['', Validators.required],
      fecha_oficio_salida: [''], // No obligatorio
      fecha_acuse_recibido: ['', Validators.required],
      destinatario: ['', Validators.required],
      cargo: ['', Validators.required],
      atencion_otorgada: ['', Validators.required],
      anexo: [''], // No obligatorio
      estatus: ['', Validators.required], //```typescript
      // Obligatorio pero sin valor por defecto
      firma_visado: [''], // No obligatorio
      comentarios: ['']
    });
  }

  // Método para formatear fechas para campos de entrada
  formatDateForInput(date: string | Date | undefined | null): string {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // Formato YYYY-MM-DD para input type="date"
    return d.toISOString().split('T')[0];
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

  /**
   * Obtiene el nombre del usuario que registró el seguimiento
   */
  getSeguimientoUsuario(): string {
    if (this.inputDetails?.seguimientos?.usuario?.username) {
      return this.formatUserName(this.inputDetails.seguimientos.usuario.username);
    }

    // Buscar en otras ubicaciones posibles dentro del objeto
    if (this.inputDetails?.seguimientos?.usuario?.username) {
      return this.formatUserName(this.inputDetails.seguimientos.usuario.username);
    }

    // Usar el editor del documento principal como última opción
    if (this.inputDetails?.editor_user?.username) {
      return this.formatUserName(this.inputDetails.editor_user.username);
    }

    return 'No disponible';
  }
}
