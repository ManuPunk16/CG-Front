import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { provideNativeDateAdapter } from '@angular/material/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Subject, catchError, finalize, of, takeUntil, tap } from 'rxjs';
import { map, startWith, debounceTime, switchMap } from 'rxjs/operators';

// Modelos y servicios
import { Input } from '../../core/models/input/input.model';
import { InputService, InputQueryParams } from '../../core/services/api/input.service';
import { CatalogService } from '../../core/services/api/catalog.service';
import { CatalogType } from '../../core/models/catalog.model';
import { EstatusEnum } from '../../core/models/enums/estatus.enum';
import { AreasEnum } from '../../core/models/enums/areas.enum';
// import { ReportesService } from '../../core/services/api/reportes.service';
import { AlertService } from '../../core/services/ui/alert.service';
import { AuthStateService } from '../../core/services/utility/auth-state.service';
import { PermissionsService } from '../../core/services/utility/permissions.service';
import { RolesEnum } from '../../core/models/enums/roles.enum';
import { DateFormatService } from '../../core/services/utility/date-format.service';
import { MatDividerModule } from '@angular/material/divider';
// Agrega la importación de la nueva interfaz
import { ApiResponse, PaginatedResponse } from '../../core/models/api-response.model';
import { AuthService } from '../../core/services';

// Importaciones necesarias
import Swal from 'sweetalert2';
import { saveAs } from 'file-saver';
import { AreaStats, AreasStatsResponse } from '../../core/models/input/input-stats.model';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatAutocompleteModule,
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    MatDividerModule
  ],
  providers: [
    DatePipe,
    provideNativeDateAdapter()
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainComponent implements OnInit, AfterViewInit, OnDestroy {
  // Inyección de servicios
  private inputService = inject(InputService);
  private catalogService = inject(CatalogService);
  // private reportesService = inject(ReportesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private liveAnnouncer = inject(LiveAnnouncer);
  private datePipe = inject(DatePipe);
  private alertService = inject(AlertService);
  private authStateService = inject(AuthStateService);
  private permissionsService = inject(PermissionsService);
  private dateFormatService = inject(DateFormatService);
  private authService = inject(AuthService);

  // Referencias a elementos del DOM
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Configuración de la tabla
  displayedColumns: string[] = [
    'actions', 'folio', 'fecha_recepcion', 'diasAtraso', 'num_oficio',
    'institucion_origen', 'remitente', 'asunto', 'asignado', 'atencion_otorgada'
  ];
  dataSource = new MatTableDataSource<Input>([]);
  isLoadingResults = false;

  // Propiedades de paginación y ordenamiento
  totalItems = 0;
  currentPage = 0;
  pageSize = 25;
  pageSizeOptions = [25, 50, 100, 500];

  // Año actual y filtros
  currentYear: number | 'all' = new Date().getFullYear();
  searchFields: string[] = [
    'folio', 'fecha_recepcion', 'num_oficio', 'institucion_origen',
    'remitente', 'asunto', 'asignado', 'atencion_otorgada', 'estatus'
  ];
  filterValues: {[key: string]: string} = {};

  // Catálogos para selects
  institutions: string[] = [];
  areas: string[] = [];
  statusOptions = Object.values(EstatusEnum);

  // Control de permisos
  isAdmin = false;
  isDirector = false;
  isDirectorGeneral = false;
  userArea = '';

  // Control del ciclo de vida
  private destroy$ = new Subject<void>();

  // Propiedades para el autocomplete
  institutionFilterControl = new FormControl('');
  filteredInstitutions: any[] = [];  // Usará el formato completo para mantener el _id y otros datos
  isLoadingInstitutions = false;
  rawInstitutionsData: any[] = []; // Almacena los datos crudos de la API

  // Añadir estas propiedades
  availableYears: number[] = [];
  isAllYearsSelected: boolean = false;
  totalAllYearsItems: number = 0;

  // Areas disponibles para mostrar en el filtro
  userAllowedAreas: string[] = [];

  // Agregar propiedades de control para exportaciones
  isExporting = false;

  ngOnInit(): void {
    // Primero cargar permisos de usuario - esto configura userAllowedAreas
    this.loadUserPermissions();

    // Luego cargar catálogos
    this.loadCatalogs();

    // Finalmente cargar años disponibles
    this.loadAvailableYears();

    // Configuración del sortingDataAccessor
    this.dataSource.sortingDataAccessor = (item: Input, property: string) => {
      switch (property) {
        case 'fecha_recepcion':
          return item.fecha_recepcion ? new Date(item.fecha_recepcion).getTime() : 0;
        case 'atencion_otorgada':
          // Manejar el nuevo formato de objeto para 'Sin registrar'
          if (item.atencion_otorgada_visual && typeof item.atencion_otorgada_visual === 'object') {
            return (item.atencion_otorgada_visual as {texto: string}).texto || '';
          }
          return item.atencion_otorgada_visual || '';
        default:
          const value = item[property as keyof Input];
          if (typeof value === 'string') {
            return value.toLowerCase();
          } else if (typeof value === 'number') {
            return value;
          } else if (value === undefined || value === null) {
            return '';
          } else {
            // For other types (boolean, object, etc.), convert to string
            return String(value).toLowerCase();
          }
      }
    };

    // Configurar el filtro de autocompletado para instituciones
    this.institutionFilterControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        startWith(''),
        debounceTime(300),  // Esperar 300ms después de que el usuario deje de escribir
      )
      .subscribe(value => {
        this.filterInstitutions(value || '');
      });
  }

  ngAfterViewInit(): void {
    // Configurar los manejadores de eventos para sort y paginación después de que las vistas estén inicializadas
    this.dataSource.sort = this.sort;

    // No asignamos this.dataSource.paginator porque haremos paginación del lado del servidor

    // Suscripción a eventos de ordenamiento
    this.sort.sortChange.subscribe(() => {
      this.paginator.pageIndex = 0;
      this.loadInputs();
    });

    // Suscripción a eventos de paginación
    this.paginator.page.subscribe(() => {
      this.loadInputs();
    });

    // Carga inicial de datos
    this.loadInputs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los permisos del usuario actual
   */
  loadUserPermissions(): void {
    const currentUser = this.authStateService.currentUser();
    if (currentUser) {
      this.isAdmin = currentUser.roles === RolesEnum.ADMIN;
      this.isDirector = currentUser.roles === RolesEnum.DIRECTOR;
      this.isDirectorGeneral = currentUser.roles === RolesEnum.DIRECTOR_GENERAL;
      this.userArea = currentUser.area || '';

      // Obtener áreas permitidas usando el servicio de permisos
      const allowedAreas = this.permissionsService.getCurrentUserAllowedAreas();

      if (allowedAreas === null) {
        // El usuario es administrador, puede ver todas las áreas
        this.userAllowedAreas = Object.values(AreasEnum);
      } else {
        this.userAllowedAreas = allowedAreas;
      }

      // console.log('Áreas permitidas para el usuario:', {
      //   userRole: currentUser.roles,
      //   userArea: this.userArea,
      //   allowedAreas: this.userAllowedAreas
      // });

      // Actualizar las áreas disponibles en el filtro
      this.updateAvailableAreas();
    }
  }

  /**
   * Actualiza la lista de áreas disponibles en el filtro según los permisos
   */
  updateAvailableAreas(): void {
    // Asignar las áreas permitidas al selector
    this.areas = [...this.userAllowedAreas];

    // console.log(`Áreas disponibles para filtrar (${this.areas.length}):`, this.areas);

    // Si ya hay un área seleccionada pero no está en las áreas permitidas, limpiarla
    if (this.filterValues['asignado'] &&
        !this.userAllowedAreas.includes(this.filterValues['asignado'])) {
      delete this.filterValues['asignado'];
      console.warn('Se eliminó el área seleccionada porque no está entre las permitidas');
    }

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  /**
   * Carga los catálogos de áreas e instituciones
   */
  loadCatalogs(): void {
    // Cargar instituciones desde CatalogService con el formato completo
    this.isLoadingInstitutions = true;
    this.catalogService.getRawCatalogItems(CatalogType.INSTITUTION)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingInstitutions = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          // Almacenar los datos crudos de instituciones
          this.rawInstitutionsData = response.institution || [];
          // Extraer los nombres para el antiguo formato (por compatibilidad)
          this.institutions = this.rawInstitutionsData.map(item => item.name);
          // Inicializar el filtrado de instituciones
          this.filterInstitutions('');
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.alertService.error('Error al cargar instituciones');
          console.error('Error cargando instituciones:', error);
        }
      });

    // Lógica actualizada: las áreas disponibles se basan en los permisos del usuario
    // En lugar de usar Object.values(AreasEnum) directamente
    this.cdr.detectChanges();
  }

  /**
   * Filtra las instituciones según lo que escribe el usuario
   */
  filterInstitutions(value: string): void {
    const filterValue = value.toLowerCase();

    this.filteredInstitutions = this.rawInstitutionsData.filter(item =>
      item.name.toLowerCase().includes(filterValue)
    );

    // Actualizar el valor en filterValues cuando se selecciona una institución
    if (this.institutionFilterControl.value) {
      this.filterValues['institucion_origen'] = this.institutionFilterControl.value;
    } else {
      delete this.filterValues['institucion_origen'];
    }
  }

  /**
   * Función para mostrar la institución seleccionada
   */
  displayInstitution = (value: string): string => {
    return value || '';
  }

  /**
   * Cargar los años disponibles con registros
   */
  loadAvailableYears(): void {
    this.inputService.getAvailableYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (years) => {
          this.availableYears = years;
          // Seleccionar año actual por defecto si existe, o el más reciente
          if (this.currentYear !== 'all' && !this.availableYears.includes(this.currentYear as number)) {
            this.currentYear = Math.max(...this.availableYears);
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar años disponibles:', error);
          this.alertService.error('Error al cargar los años disponibles');
        }
      });
  }

  /**
   * Maneja el cambio de año seleccionado
   */
  onYearChange(): void {
    // Resetear paginación
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    // Manejar selección de "Todos los años"
    if (this.currentYear === 'all') {
      this.isAllYearsSelected = true;
      this.inputService.getTotalCount().subscribe(total => {
        this.totalAllYearsItems = total;
        this.cdr.detectChanges();
      });
    } else {
      this.isAllYearsSelected = false;
    }

    // Recargar datos
    this.loadInputs();
  }

  /**
   * Carga los inputs con paginación y filtros
   */
  loadInputs(): void {
    this.isLoadingResults = true;

    // Construir parámetros base
    const params: InputQueryParams = {
      year: this.isAllYearsSelected ? null : (this.currentYear === 'all' ? null : this.currentYear),
      page: this.paginator?.pageIndex || 0,
      limit: this.paginator?.pageSize || this.pageSize,
      sortBy: this.sort?.active || 'fecha_recepcion',
      sortOrder: this.sort?.direction || 'asc',
      // Siempre enviar rol y área para permitir decisiones en el backend
      userRole: this.authService.getCurrentUser()?.roles,
      userArea: this.userArea
    };

    // Agregar filtros no vacíos al objeto de parámetros
    Object.keys(this.filterValues).forEach(key => {
      const value = this.filterValues[key];
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value;
      }
    });

    // console.log('Parámetros de búsqueda completos:', params);

    // Llamar al servicio...
    this.inputService.getInputs(params)
      .pipe(
        takeUntil(this.destroy$),
        tap(response => {
          // console.log('Respuesta del servidor:', response);

          // Agrega esta línea para comparar (ahora correctamente tipada)
          // console.log('Filtros aplicados vs. filtros devueltos:', {
          //   enviados: params,
          //   recibidos: response.data.filters
          // });

          if (response && response.data) {
            // Acceder directamente a los inputs
            const inputs = response.data.inputs || [];

            this.dataSource.data = this.procesarDatos(inputs);

            // Acceder a la información de paginación
            const pagination = response.data.pagination;
            if (pagination) {
              this.totalItems = pagination.totalItems || 0;
              this.currentPage = pagination.currentPage || 0;

              // Actualizamos la información del paginador
              if (this.paginator) {
                this.paginator.length = this.totalItems;
                this.paginator.pageIndex = this.currentPage;
              }
            }
          } else {
            console.error('Error: respuesta sin datos', response);
            this.dataSource.data = [];
            this.totalItems = 0;
            this.alertService.error('La respuesta del servidor no tiene el formato esperado');
          }
        }),
        catchError(error => {
          this.alertService.error('Error al cargar los registros');
          console.error('Error cargando inputs:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoadingResults = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe();
  }

  /**
   * Aplica los filtros de búsqueda
   */
  applyFilters(): void {
    // Procesar formato de fecha (convertir de dd/mm/yyyy a formato ISO)
    if (this.filterValues['fecha_recepcion']) {
      const dateParts = this.filterValues['fecha_recepcion'].split('/');
      if (dateParts.length === 3) {
        try {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const year = parseInt(dateParts[2], 10);

          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            // Crear fecha para el día específico
            const date = new Date(year, month, day);

            // Establecer la fecha de inicio como el día seleccionado a las 00:00:00
            this.filterValues['fecha_recepcion_start'] =
              `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Establecer la fecha de fin como el mismo día a las 23:59:59
            this.filterValues['fecha_recepcion_end'] =
              `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Eliminar el filtro original
            delete this.filterValues['fecha_recepcion'];

            console.log('Filtros de fecha ajustados:', {
              startDate: this.filterValues['fecha_recepcion_start'],
              endDate: this.filterValues['fecha_recepcion_end']
            });
          }
        } catch (error) {
          console.error('Error al procesar fecha:', error);
          delete this.filterValues['fecha_recepcion'];
        }
      }
    }

    // Asegurar que el valor del autocompletado de institución se sincronice
    if (this.institutionFilterControl.value) {
      this.filterValues['institucion_origen'] = this.institutionFilterControl.value;
    }

    // Procesar campos de texto para eliminar espacios extras
    ['num_oficio', 'remitente', 'asunto', 'institucion_origen', 'atencion_otorgada'].forEach(field => {
      if (this.filterValues[field]) {
        this.filterValues[field] = this.filterValues[field].trim();
      }
    });

    // Procesar campo folio (puede ser número o cadena)
    if (this.filterValues['folio']) {
      // Mantenerlo como string para permitir búsquedas parciales
      this.filterValues['folio'] = this.filterValues['folio'].trim();
    }

    // Reiniciar la paginación al aplicar filtros
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    // Cargar datos con los filtros aplicados
    this.loadInputs();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    // Limpiar objeto de filtros
    this.filterValues = {};

    // Asegurarse de eliminar específicamente los filtros de fecha
    delete this.filterValues['fecha_recepcion'];
    delete this.filterValues['fecha_recepcion_start'];
    delete this.filterValues['fecha_recepcion_end'];

    // Limpiar controles específicos
    this.institutionFilterControl.setValue('', {emitEvent: false});

    // Reiniciar paginación
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    // Recargar datos sin filtros
    this.loadInputs();

    // Notificar al usuario
    this.alertService.info('Filtros limpiados');
  }

  /**
   * Anuncia el cambio en la ordenación para lectores de pantalla
   */
  announceSortChange(sortState: Sort): void {
    if (sortState.direction) {
      this.liveAnnouncer.announce(`Ordenado ${sortState.direction === 'asc' ? 'ascendente' : 'descendente'}`);
    } else {
      this.liveAnnouncer.announce('Ordenación eliminada');
    }
  }

  /**
   * Devuelve el texto de atención otorgada
   */
  getAtencionOtorgada(input: Input): string {
    if (!input.seguimientos) return '-';
    return input.seguimientos.atencion_otorgada?.trim() || '-';
  }

  /**
   * Calcula los días de atraso y asigna color de semáforo
   * @param input El registro de entrada
   * @returns Objeto con días de atraso y color de semáforo
   */
  private calcularDiasAtraso(input: any): { diasAtraso: number; colorSemaforo: string } {
    let diasAtraso = 0;
    let colorSemaforo = 'bg-gray-300'; // Color default para neutro/indefinido

    // Siempre necesitamos fecha_recepcion
    if (!input.fecha_recepcion) {
      return { diasAtraso, colorSemaforo };
    }

    const fechaRecepcion = new Date(input.fecha_recepcion);

    // Si no hay seguimientos, usar fecha actual para el cálculo
    if (!input.seguimientos || !input.seguimientos.fecha_acuse_recibido) {
      const fechaActual = new Date();
      diasAtraso = this.calcularDiasEntreFechas(fechaRecepcion, fechaActual);
    } else {
      // Si hay fecha de acuse, calcular hasta esa fecha
      const fechaAcuse = new Date(input.seguimientos.fecha_acuse_recibido);
      diasAtraso = this.calcularDiasEntreFechas(fechaRecepcion, fechaAcuse);
    }

    // Asignar color según días de atraso
    if (diasAtraso <= 3) {
      colorSemaforo = 'bg-green-500'; // Verde para menos de 3 días
    } else if (diasAtraso <= 7) {
      colorSemaforo = 'bg-yellow-500'; // Amarillo para 4-7 días
    } else {
      colorSemaforo = 'bg-red-500'; // Rojo para más de 7 días
    }

    return { diasAtraso, colorSemaforo };
  }

  /**
   * Calcula días entre dos fechas, incluyendo fines de semana (días naturales)
   * @param fechaInicio Fecha inicial
   * @param fechaFin Fecha final
   * @returns Número de días naturales entre fechas
   */
  private calcularDiasEntreFechas(fechaInicio: Date, fechaFin: Date): number {
    // Asegurar que fechaInicio es anterior o igual a fechaFin
    if (fechaInicio > fechaFin) {
      return 0;
    }

    // Clonar fechas para no modificar las originales
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Reset a medianoche para contar días completos
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    // Calcular diferencia en días naturales usando milisegundos
    const unDiaEnMs = 24 * 60 * 60 * 1000; // Milisegundos en un día
    const diferenciaTiempo = fin.getTime() - inicio.getTime();
    const diasTotales = Math.round(diferenciaTiempo / unDiaEnMs);

    return diasTotales;
  }

  /**
   * Obtener texto para mostrar en la columna de días atraso
   */
  getDiasAtrasoText(item: any): string {
    if (!item.fecha_recepcion) {
      return 'N/A';
    }

    // Determinar si usar fecha actual o fecha de acuse
    let fechaFin: Date;

    if (item.seguimientos?.fecha_acuse_recibido) {
      fechaFin = new Date(item.seguimientos.fecha_acuse_recibido);
    } else {
      fechaFin = new Date(); // Fecha actual si no hay acuse
    }

    const fechaInicio = new Date(item.fecha_recepcion);
    const diasAtraso = this.calcularDiasEntreFechas(fechaInicio, fechaFin);

    // Si no hay acuse, indicar que el contador sigue activo
    if (!item.seguimientos?.fecha_acuse_recibido) {
      return `${diasAtraso} días (activo)`;
    }

    return `${diasAtraso} días`;
  }

  /**
   * Aplicar cálculos y coloración a los elementos de la tabla
   */
  private procesarDatos(data: any[]): any[] {
    return data.map(item => {
      // Calcular días de atraso y color semáforo
      const { diasAtraso, colorSemaforo } = this.calcularDiasAtraso(item);

      // Verificar si tiene atención otorgada en el seguimiento
      const tieneAtencion = item.seguimientos &&
                          item.seguimientos.atencion_otorgada &&
                          item.seguimientos.atencion_otorgada.trim() !== '';

      // Texto para mostrar en columna de atención otorgada con formato más descriptivo
      let atencionOtorgada;

      if (tieneAtencion) {
        // Limitar largo del texto para visualización
        atencionOtorgada = item.seguimientos.atencion_otorgada.length > 100
          ? item.seguimientos.atencion_otorgada.substring(0, 100) + '...'
          : item.seguimientos.atencion_otorgada;
      } else {
        // Texto más descriptivo para cuando no hay atención registrada
        atencionOtorgada = {
          texto: 'Atención otorgada por parte del enlace no registrada',
          sinRegistrar: true
        };
      }

      return {
        ...item,
        diasAtraso,
        colorSemaforo,
        atencion_otorgada_visual: atencionOtorgada
      };
    });
  }

  /**
   * Devuelve el color del semáforo basado en los días de atraso
   */
  getColorSemaforo(input: Input): string {
    if (input.estatus === EstatusEnum.ATENDIDO) return 'bg-green-500';

    const dias = this.calcularDiasAtraso(input).diasAtraso;
    if (dias === -1) return 'bg-gray-500';

    if (dias <= 15) return 'bg-green-500';
    if (dias <= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  /**
   * Devuelve la clase CSS para una fila basada en su estatus
   */
  getRowClass(input: Input): string {
    switch (input.estatus) {
      case EstatusEnum.ATENDIDO:
        return 'bg-green-50 hover:bg-green-100';
      case EstatusEnum.NO_ATENDIDO:
        return 'bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'hover:bg-gray-100';
    }
  }

  /**
   * Navega a la vista detallada de un registro
   */
  verDetalles(input: Input): void {
    if (input._id) {
      window.open(`Entradas/Ficha-tecnica/${input._id}`, '_blank');
    }
  }

  /**
   * Navega a la pantalla de edición de un registro
   */
  editarRegistro(input: Input): void {
    if (input._id) {
      this.router.navigate(['/editar-entrada', input._id]);
    }
  }

  /**
   * Navega a la pantalla de edición de seguimiento
   */
  editarSeguimiento(input: Input): void {
    if (input._id) {
      this.router.navigate(['/editar-seguimiento', input._id]);
    }
  }

  /**
   * Navega a la pantalla de creación de nuevo registro
   */
  crearNuevoRegistro(): void {
    this.router.navigate(['/nueva-entrada']);
  }

  /**
   * Valida el formato de fecha al perder foco
   */
  validateDateFormat(event: any): void {
    const inputValue = event.target.value;
    if (!inputValue) return;

    // Validar formato dd/mm/yyyy usando regex
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = inputValue.match(dateRegex);

    if (!match) {
      this.alertService.warning('Formato de fecha incorrecto. Use dd/mm/yyyy');
      return;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validar valores
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      this.alertService.warning('Fecha inválida');
    }
  }

  // No necesitamos los métodos de paginación personalizados ya que usamos MatPaginator

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return Object.values(this.filterValues).some(value =>
      value !== null && value !== undefined && value !== '');
  }

  /**
   * Cuenta cuántos filtros activos hay (excluyendo pares start/end)
   */
  countActiveFilters(): number {
    // Crear una copia del objeto de filtros
    const filtersCopy = { ...this.filterValues };

    // Si hay ambos filtros de fecha, contar como uno solo
    if (filtersCopy['fecha_recepcion_start'] && filtersCopy['fecha_recepcion_end']) {
      // Si también existe fecha_recepcion, no contar los _start y _end por separado
      if (filtersCopy['fecha_recepcion']) {
        delete filtersCopy['fecha_recepcion_start'];
        delete filtersCopy['fecha_recepcion_end'];
      }
    }

    return Object.values(filtersCopy).filter(value =>
      value !== null && value !== undefined && value !== '').length;
  }

  /**
   * Exporta todos los registros a Excel
   */
  exportarTodos(): void {
    Swal.fire({
      title: 'Exportar registros',
      text: '¿Deseas exportar todos los registros? Esto puede tardar varios minutos dependiendo del volumen de datos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExporting = true;

        // Parámetros para la exportación
        const params: any = {
          year: this.currentYear === 'all' ? null : this.currentYear
        };

        // Si es admin o director general, no filtrar por área
        if (!this.isAdmin && !this.isDirectorGeneral) {
          params.area = this.userArea;
        }

        // Usar el servicio en lugar de llamada HTTP directa
        this.inputService.exportToExcel(params).pipe(
          finalize(() => {
            this.isExporting = false;
            this.cdr.detectChanges();
          })
        ).subscribe({
          next: (blob: Blob) => {
            const fileName = `Control_Gestion_${this.currentYear === 'all' ? 'Todos' : this.currentYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(blob, fileName);

            Swal.fire({
              title: 'Exportación completada',
              text: 'Los datos han sido exportados exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al exportar:', error);
            this.alertService.error('Ha ocurrido un error al exportar los datos');
          }
        });
      }
    });
  }

  /**
   * Exporta los registros filtrados a Excel
   */
  exportarFiltrados(): void {
    if (!this.hasActiveFilters()) {
      this.alertService.warning('No hay filtros activos. Por favor aplica algún filtro antes de exportar');
      return;
    }

    Swal.fire({
      title: 'Exportar registros filtrados',
      text: '¿Deseas exportar los registros con los filtros actuales?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExporting = true;

        // Usar los mismos parámetros que en la búsqueda actual
        const params: any = {
          year: this.currentYear === 'all' ? null : this.currentYear,
          ...this.filterValues
        };

        // Usar el servicio en lugar de llamada HTTP directa
        this.inputService.exportToExcel(params).pipe(
          finalize(() => {
            this.isExporting = false;
            this.cdr.detectChanges();
          })
        ).subscribe({
          next: (blob: Blob) => {
            const fileName = `Control_Gestion_Filtrado_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(blob, fileName);

            Swal.fire({
              title: 'Exportación completada',
              text: 'Los datos filtrados han sido exportados exitosamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al exportar filtrados:', error);
            this.alertService.error('Ha ocurrido un error al exportar los datos filtrados');
          }
        });
      }
    });
  }

  /**
   * Exporta registros por área seleccionada
   */
  exportarPorArea(): void {
    // Si el usuario no es admin o director general, solo puede exportar su área
    if (!this.isAdmin && !this.isDirectorGeneral) {
      this.exportarAreaEspecifica(this.userArea);
      return;
    }

    // Para admin o director general, mostrar selector de áreas
    Swal.fire({
      title: 'Seleccionar área',
      text: 'Selecciona el área para exportar',
      input: 'select',
      inputOptions: this.areasToObject(),
      inputPlaceholder: 'Selecciona un área',
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes seleccionar un área';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.exportarAreaEspecifica(result.value);
      }
    });
  }

  /**
   * Exporta datos de un área específica
   */
  private exportarAreaEspecifica(area: string): void {
    this.isExporting = true;

    const params: any = {
      year: this.currentYear === 'all' ? null : this.currentYear,
      area: area
    };

    // Usar el servicio en lugar de llamada HTTP directa
    this.inputService.exportToExcel(params).pipe(
      finalize(() => {
        this.isExporting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (blob: Blob) => {
        const fileName = `Control_Gestion_${area.replace(/\s+/g, '_')}_${this.currentYear === 'all' ? 'Todos' : this.currentYear}.xlsx`;
        saveAs(blob, fileName);

        Swal.fire({
          title: 'Exportación completada',
          text: `Los datos del área "${area}" han sido exportados exitosamente`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al exportar área específica:', error);
        this.alertService.error('Ha ocurrido un error al exportar los datos del área');
      }
    });
  }

  /**
   * Convierte el array de áreas a un objeto para el select de SweetAlert2
   */
  private areasToObject(): {[key: string]: string} {
    const result: {[key: string]: string} = {};

    // Para admin mostrar todas las áreas disponibles
    const areasToShow = this.isAdmin ? Object.values(AreasEnum) : this.userAllowedAreas;

    areasToShow.forEach(area => {
      result[area] = area;
    });

    return result;
  }

  /**
   * Muestra las estadísticas de las áreas
   */
  verEstadisticasAreas(): void {
    // Usar el año seleccionado o el actual si es "all"
    const yearToShow = this.currentYear === 'all' ? new Date().getFullYear() : this.currentYear;

    Swal.fire({
      title: 'Cargando estadísticas',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();

        // Usar el servicio
        this.inputService.getEstadisticasRegistros().subscribe({
          next: (response: AreasStatsResponse) => {
            Swal.close();
            // Pasar también el año seleccionado
            this.mostrarEstadisticas(response.data, yearToShow as number);
          },
          error: (error) => {
            console.error('Error al obtener estadísticas:', error);
            Swal.fire({
              title: 'Error',
              text: 'Ha ocurrido un error al obtener las estadísticas',
              icon: 'error'
            });
          }
        });
      }
    });
  }

  /**
   * Muestra las estadísticas en un modal Swal con formato
   */
  private mostrarEstadisticas(datos: any[], selectedYear: number): void {
    // Crear tabla HTML para mostrar estadísticas
    let htmlContent = '<div class="estadisticas-container" style="max-width: 100%; overflow-x: auto;">';

    // Título y subtítulo
    htmlContent += `<h3 style="margin-bottom:15px;">Estadísticas de Registros por Área</h3>`;
    htmlContent += `<p style="margin-bottom:20px;">Año seleccionado: ${selectedYear}</p>`;

    // Tabla de estadísticas - Ajustando ancho para usar espacio disponible
    htmlContent += '<table class="stats-table" style="width:100%; border-collapse:collapse; min-width:800px;">';

    // Encabezados con más espacio y mejor alineación - AÑADIR COLUMNA DE RESPUESTA REGISTRADA
    htmlContent += `
      <tr style="background-color:#f3f4f6; font-weight:bold;">
        <th style="padding:12px 16px; text-align:left; border:1px solid #ddd;">Área</th>
        <th style="padding:12px 16px; text-align:center; border:1px solid #ddd; min-width:80px;">Total</th>
        <th style="padding:12px 16px; text-align:center; border:1px solid #ddd; min-width:100px;">Atendidos</th>
        <th style="padding:12px 16px; text-align:center; border:1px solid #ddd; min-width:120px;">No Atendidos</th>
        <th style="padding:12px 16px; text-align:center; border:1px solid #ddd; min-width:130px;">Respuesta Registrada</th>
        <th style="padding:12px 16px; text-align:center; border:1px solid #ddd; min-width:100px;">% Atención</th>
      </tr>
    `;

    // Variables para el resumen total
    let totalRegistros = 0;
    let totalAtendidos = 0;
    let totalNoAtendidos = 0;
    let totalRespuestasRegistradas = 0;

    // Procesar los datos para el año actual
    if (Array.isArray(datos)) {
      datos.forEach(direccion => {
        // Obtener datos para el año actual
        const datosAnioActual = this.obtenerDatosAnioActual(direccion, selectedYear);

        // Calcular totales
        const total = datosAnioActual.atendido + datosAnioActual.noAtendido;

        // Calcular porcentaje basado en respuestas registradas, no en estatus
        const porcentajeAtencion = total > 0
          ? Math.round((datosAnioActual.respuestaRegistrada / total) * 100)
          : 0;

        // Determinar el color según el porcentaje
        const color = porcentajeAtencion >= 75
          ? 'green'
          : porcentajeAtencion >= 50
            ? '#f59e0b'
            : 'red';

        // Actualizar totales generales
        totalRegistros += total;
        totalAtendidos += datosAnioActual.atendido;
        totalNoAtendidos += datosAnioActual.noAtendido;
        totalRespuestasRegistradas += datosAnioActual.respuestaRegistrada;

        htmlContent += `
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:10px 16px; border:1px solid #ddd;">${direccion.direccion}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${total}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnioActual.atendido}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnioActual.noAtendido}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnioActual.respuestaRegistrada}</td>
            <td style="padding:10px 16px; text-align:center; font-weight:bold; border:1px solid #ddd; color:${color};">
              ${porcentajeAtencion}%
            </td>
          </tr>
        `;
      });
    } else {
      htmlContent += `
        <tr>
          <td colspan="6" style="padding:8px; text-align:center;">No hay datos disponibles</td>
        </tr>
      `;
    }

    // Calcular porcentaje global basado en respuestas registradas
    const porcentajeGlobal = totalRegistros > 0
      ? Math.round((totalRespuestasRegistradas / totalRegistros) * 100)
      : 0;

    // Color para el porcentaje global
    const colorGlobal = porcentajeGlobal >= 75
      ? 'green'
      : porcentajeGlobal >= 50
        ? '#f59e0b'
        : 'red';

    htmlContent += '</table>';

    // Resumen anual actualizado con respuestas registradas
    htmlContent += `
      <div style="margin-top:20px; padding:15px; background-color:#f9fafb; border-radius:5px; border:1px solid #e5e7eb;">
        <h4 style="margin-top:0;">Resumen Anual ${selectedYear}</h4>
        <div style="display:flex; justify-content:space-around; flex-wrap:wrap; text-align:center; margin-top:10px;">
          <div style="margin:10px;">
            <strong style="display:block; font-size:18px;">${totalRegistros}</strong>
            <span>Total</span>
          </div>
          <div style="margin:10px;">
            <strong style="display:block; font-size:18px; color:green;">${totalAtendidos}</strong>
            <span>Atendidos</span>
          </div>
          <div style="margin:10px;">
            <strong style="display:block; font-size:18px; color:red;">${totalNoAtendidos}</strong>
            <span>No Atendidos</span>
          </div>
          <div style="margin:10px;">
            <strong style="display:block; font-size:18px; color:blue;">${totalRespuestasRegistradas}</strong>
            <span>Respuestas Registradas</span>
          </div>
          <div style="margin:10px;">
            <strong style="display:block; font-size:18px; color:${colorGlobal};">${porcentajeGlobal}%</strong>
            <span>Atención Global</span>
          </div>
        </div>
      </div>
    `;

    htmlContent += `
      <p style="margin-top:20px; font-style:italic; color:#6b7280;">
        Las estadísticas muestran el porcentaje de oficios con respuestas registradas por cada área en el año ${selectedYear}.
      </p>
    `;

    htmlContent += '</div>';

    // Mostrar estadísticas
    Swal.fire({
      title: 'Estadísticas de Áreas',
      html: htmlContent,
      width: 1100, // Aumentar para acomodar la columna extra
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3085d6',
      // Permite que el modal sea aún más grande en pantallas grandes
      customClass: {
        container: 'swal-wide-container',
        popup: 'swal-wide-popup'
      }
    });
  }

  /**
   * Obtiene los datos consolidados para el año actual, ahora con respuestas registradas
   */
  private obtenerDatosAnioActual(direccion: any, currentYear: number): {
    atendido: number,
    noAtendido: number,
    respuestaRegistrada: number
  } {
    // Valores por defecto
    const resultado = { atendido: 0, noAtendido: 0, respuestaRegistrada: 0 };

    // Buscar los datos del año actual
    if (direccion.anios && Array.isArray(direccion.anios)) {
      const anioActual = direccion.anios.find((a: any) => a.anio === currentYear);

      if (anioActual && Array.isArray(anioActual.meses)) {
        // Sumar los valores de todos los meses del año actual
        anioActual.meses.forEach((mes: any) => {
          resultado.atendido += mes.atendido || 0;
          resultado.noAtendido += mes.noAtendido || 0;
          resultado.respuestaRegistrada += mes.respuestaRegistrada || 0;
        });
      }
    }

    return resultado;
  }
}
