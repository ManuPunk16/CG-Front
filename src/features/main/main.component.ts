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
import { Subject, catchError, finalize, forkJoin, of, takeUntil, tap } from 'rxjs';
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
    this.catalogService.getRawCatalogItems(CatalogType.INSTITUTION, 1000) // Solicitar hasta 1000 instituciones
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
          console.log(`Se cargaron ${this.rawInstitutionsData.length} instituciones del catálogo`);

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
    if (typeof value !== 'string') {
      console.warn('Valor no es string:', value);
      return;
    }

    const filterValue = value.toLowerCase().trim();

    try {
      if (!this.rawInstitutionsData || !Array.isArray(this.rawInstitutionsData)) {
        console.warn('No hay datos de instituciones para filtrar');
        this.filteredInstitutions = [];
        return;
      }

      // Si el valor del filtro está vacío, limitar a mostrar las primeras 100 para mejor rendimiento
      if (!filterValue) {
        this.filteredInstitutions = this.rawInstitutionsData.slice(0, 1000);
        console.log('Mostrando las primeras 1000 instituciones (campo vacío)');
      } else {
        // Si hay un valor de filtro, aplicar el filtro sin límite de resultados
        this.filteredInstitutions = this.rawInstitutionsData.filter(item =>
          item && item.name && item.name.toLowerCase().includes(filterValue)
        );
      }

      console.log(`Se encontraron ${this.filteredInstitutions.length} instituciones que coinciden`);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al filtrar instituciones:', error);
      this.filteredInstitutions = [];
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
   * Valida el formato de fecha al perder foco
   */
  validateDateFormat(event: any): void {
    const inputValue = event.target.value;
    if (!inputValue) return;

    // Para input tipo "date" no es necesario validar el formato
    // ya que el navegador asegura que sea válido
    if (event.target.type === 'date') {
      return;
    }

    // Solo para campos de texto donde se espera formato dd/mm/yyyy
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Si ya está en formato ISO, también es válido
    if (isoDateRegex.test(inputValue)) {
      return;
    }

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

  /**
   * Navega a la pantalla de creación de nuevo registro
   */
  crearNuevoRegistro(): void {
    // Mostrar un loader mientras cargamos los catálogos
    Swal.fire({
      title: 'Preparando formulario',
      text: 'Cargando catálogos...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Primero cargar todos los catálogos necesarios
    this.catalogService.getRawCatalogItems(CatalogType.INSTITUTION, 1000)
      .pipe(
        switchMap(institutionsResponse => {
          // Guardar los datos de instituciones
          const institutions = institutionsResponse?.institution || [];

          // Luego cargar instrumentos jurídicos
          return this.catalogService.getRawCatalogItems(CatalogType.INSTRUMENT, 1000).pipe(
            map(instrumentsResponse => {
              // Devolver ambos datos juntos
              return {
                instituciones: institutions,
                instrumentos: instrumentsResponse?.instrument || []
              };
            })
          );
        }),
        catchError(error => {
          console.error('Error cargando catálogos:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los catálogos necesarios.'
          });
          return of({ instituciones: [], instrumentos: [] });
        })
      ).subscribe({
        next: (catalogs) => {
          // Cerrar el loader
          Swal.close();

          // Verificar que los catálogos no estén vacíos
          if (catalogs.instituciones.length === 0 || catalogs.instrumentos.length === 0) {
            this.alertService.warning('Algunos catálogos están vacíos. Puede que falte información en el formulario.');
          }

          console.log(`Catálogos cargados: ${catalogs.instituciones.length} instituciones, ${catalogs.instrumentos.length} instrumentos`);

          // Mostrar el formulario de creación con los catálogos completos
          this.mostrarFormularioCreacion(catalogs.instituciones, catalogs.instrumentos);
        }
      });
  }

  private mostrarFormularioCreacion(instituciones: any[], instrumentosJuridicos: any[]): void {
    // Estado para el formulario
    let currentYear = new Date().getFullYear();
    let ultimoFolio = 0;
    let folioExiste = false;
    let isCheckingFolio = false;
    let filteredInstitutions: any[] = [...instituciones];
    let filteredInstrumentos: any[] = [...instrumentosJuridicos];

    // Recuperar datos guardados del localStorage
    const formStorageKey = 'cg_form_data';
    const savedFormData = localStorage.getItem(formStorageKey);
    const formData = savedFormData ? JSON.parse(savedFormData) : {};

    // Configurar valores iniciales (usar valores guardados o valores por defecto)
    const initialValues = {
      anio: formData.anio || currentYear,
      folio: formData.folio || '',
      numOficio: formData.numOficio || '',
      fechaOficio: formData.fechaOficio || '',
      fechaRecepcion: formData.fechaRecepcion || '',
      fechaVencimiento: formData.fechaVencimiento || '',
      horaRecepcion: formData.horaRecepcion || '',
      instrumentoJuridico: formData.instrumentoJuridico || '',
      remitente: formData.remitente || '',
      institucion: formData.institucion || '',
      area: formData.area || '',
      asunto: formData.asunto || '',
      observacion: formData.observacion || ''
    };

    // Construir el contenido HTML del formulario
    const formHtml = `
      <form id="crear-registro-form" class="text-left">
        <!-- Año y Folio -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-anio">
              Año*
            </label>
            <input
              id="swal-input-anio"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="number"
              value="${initialValues.anio}"
              min="2000"
              max="2100"
              required>
            <p id="anio-feedback" class="mt-1 text-xs text-gray-500">Ingresa el año del documento</p>
          </div>

          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-folio">
              Folio*
            </label>
            <div class="relative">
              <input
                id="swal-input-folio"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                type="number"
                value="${initialValues.folio}"
                min="1"
                required>
              <div id="folio-spinner" class="hidden absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <p id="folio-feedback" class="mt-1 text-xs text-gray-500">El último folio es: <span id="ultimo-folio">${ultimoFolio}</span></p>
          </div>
        </div>

        <!-- Número de oficio y Fecha de oficio -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-num-oficio">
              Número de Oficio*
            </label>
            <input
              id="swal-input-num-oficio"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value="${initialValues.numOficio}"
              required>
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha-oficio">
              Fecha de Oficio*
            </label>
            <input
              id="swal-input-fecha-oficio"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value="${initialValues.fechaOficio}"
              required>
          </div>
        </div>

        <!-- Fechas: recepción y vencimiento -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha-recepcion">
              Fecha de Recepción*
            </label>
            <input
              id="swal-input-fecha-recepcion"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value="${initialValues.fechaRecepcion}"
              required>
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-fecha-vencimiento">
              Fecha de Vencimiento*
            </label>
            <input
              id="swal-input-fecha-vencimiento"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="date"
              value="${initialValues.fechaVencimiento}"
              required>
          </div>
        </div>

        <!-- Hora de recepción y instrumento jurídico -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-hora-recepcion">
              Hora de Recepción
            </label>
            <input
              id="swal-input-hora-recepcion"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="time"
              value="${initialValues.horaRecepcion}">
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-instrumento-juridico-search">
              Instrumento Jurídico*
            </label>
            <div class="relative">
              <input
                id="swal-input-instrumento-juridico-search"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-10"
                type="text"
                placeholder="Buscar instrumento jurídico"
                value="${initialValues.instrumentoJuridico}"
                autocomplete="off"
                required>
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-400 sm:text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"></path>
                  </svg>
                </span>
              </div>
              <input type="hidden" id="swal-input-instrumento-juridico" value="${initialValues.instrumentoJuridico}">
            </div>
            <div id="instrumentos-dropdown" class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm hidden">
              <ul></ul>
            </div>
          </div>
        </div>

        <!-- Remitente e institución origen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-remitente">
              Remitente*
            </label>
            <input
              id="swal-input-remitente"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value="${initialValues.remitente}"
              required>
          </div>
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-institucion-search">
              Institución de Origen*
            </label>
            <div class="relative">
              <input
                id="swal-input-institucion-search"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-10"
                type="text"
                placeholder="Buscar institución"
                value="${initialValues.institucion}"
                autocomplete="off"
                required>
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-400 sm:text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"></path>
                  </svg>
                </span>
              </div>
              <input type="hidden" id="swal-input-institucion" value="${initialValues.institucion}">
            </div>
            <div id="instituciones-dropdown" class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm hidden">
              <ul></ul>
            </div>
          </div>
        </div>

        <!-- Área asignada -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-area">
            Área Asignada*
          </label>
          <select
            id="swal-input-area"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required>
            <option value="">Selecciona un área</option>
            ${this.areas.map(area => `<option value="${area}" ${initialValues.area === area ? 'selected' : ''}>${area}</option>`).join('')}
          </select>
        </div>

        <!-- Asunto -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-asunto">
            Asunto*
          </label>
          <textarea
            id="swal-input-asunto"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            required>${initialValues.asunto}</textarea>
        </div>

        <!-- Observaciones -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="swal-input-observacion">
            Observación
          </label>
          <textarea
            id="swal-input-observacion"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows="2">${initialValues.observacion}</textarea>
        </div>
      </form>
    `;

    Swal.fire({
      title: 'Crear Nuevo Registro',
      html: formHtml,
      width: '1000px',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      focusConfirm: false,
      customClass: {
        container: 'swal-wide',
        popup: 'swal-wide-popup'
      },
      didOpen: () => {
        // Función para guardar los valores del formulario en localStorage
        const saveFormData = () => {
          const formData = {
            anio: (document.getElementById('swal-input-anio') as HTMLInputElement).value,
            folio: (document.getElementById('swal-input-folio') as HTMLInputElement).value,
            numOficio: (document.getElementById('swal-input-num-oficio') as HTMLInputElement).value,
            fechaOficio: (document.getElementById('swal-input-fecha-oficio') as HTMLInputElement).value,
            fechaRecepcion: (document.getElementById('swal-input-fecha-recepcion') as HTMLInputElement).value,
            fechaVencimiento: (document.getElementById('swal-input-fecha-vencimiento') as HTMLInputElement).value,
            horaRecepcion: (document.getElementById('swal-input-hora-recepcion') as HTMLInputElement).value,
            instrumentoJuridico: (document.getElementById('swal-input-instrumento-juridico') as HTMLInputElement).value ||
                                (document.getElementById('swal-input-instrumento-juridico-search') as HTMLInputElement).value,
            remitente: (document.getElementById('swal-input-remitente') as HTMLInputElement).value,
            institucion: (document.getElementById('swal-input-institucion') as HTMLInputElement).value ||
                        (document.getElementById('swal-input-institucion-search') as HTMLInputElement).value,
            area: (document.getElementById('swal-input-area') as HTMLSelectElement).value,
            asunto: (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value,
            observacion: (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value
          };

          localStorage.setItem(formStorageKey, JSON.stringify(formData));
        };

        // Agregar listeners para guardar datos en cambios
        const formInputs = document.querySelectorAll('#crear-registro-form input, #crear-registro-form textarea, #crear-registro-form select');
        formInputs.forEach(input => {
          input.addEventListener('change', saveFormData);
          input.addEventListener('blur', saveFormData);
        });

        // Función para actualizar folio al cambiar el año
        const updateFolioInfo = (year: number) => {
          // Lógica existente...
          isCheckingFolio = true;

          // Mostrar spinner
          document.getElementById('folio-spinner')?.classList.remove('hidden');

          // Actualizar feedback
          document.getElementById('folio-feedback')!.innerHTML =
            '<span class="text-blue-500">Consultando último folio...</span>';

          // Obtener el último folio para el año seleccionado
          this.inputService.getUltimoFolio(year).pipe(
            finalize(() => {
              isCheckingFolio = false;
              document.getElementById('folio-spinner')?.classList.add('hidden');
            })
          ).subscribe({
            next: (folio) => {
              ultimoFolio = folio;
              document.getElementById('folio-feedback')!.innerHTML =
                `El último folio es: <span class="font-medium">${ultimoFolio}</span>`;

              // Sugerir el siguiente folio si no hay uno guardado o seleccionado
              const folioInput = document.getElementById('swal-input-folio') as HTMLInputElement;
              if (!folioInput.value) {
                folioInput.value = (ultimoFolio + 1).toString();
                // Validar el folio sugerido
                validarFolio(year, ultimoFolio + 1);
                // Guardar el folio actualizado
                saveFormData();
              }
            },
            error: (error) => {
              console.error('Error al obtener el último folio:', error);
              document.getElementById('folio-feedback')!.innerHTML =
                '<span class="text-red-500">Error al consultar el último folio</span>';
            }
          });
        };

        // Función para validar si un folio ya existe
        const validarFolio = (year: number, folio: number) => {
          // Lógica existente...
          if (!year || !folio) return;

          isCheckingFolio = true;
          document.getElementById('folio-spinner')?.classList.remove('hidden');
          document.getElementById('folio-feedback')!.innerHTML =
            '<span class="text-blue-500">Verificando disponibilidad...</span>';

          this.inputService.existeFolio(year, folio).pipe(
            finalize(() => {
              isCheckingFolio = false;
              document.getElementById('folio-spinner')?.classList.add('hidden');
            })
          ).subscribe({
            next: (existe) => {
              folioExiste = existe;
              const folioInput = document.getElementById('swal-input-folio') as HTMLInputElement;

              if (existe) {
                document.getElementById('folio-feedback')!.innerHTML =
                  `<span class="text-red-500">El folio ${folio} ya existe para el año ${year}</span>`;
                folioInput.classList.add('border-red-500');
              } else {
                document.getElementById('folio-feedback')!.innerHTML =
                  `<span class="text-green-500">El folio ${folio} está disponible</span>`;
                folioInput.classList.remove('border-red-500');
              }
            },
            error: (error) => {
              console.error('Error al verificar el folio:', error);
              document.getElementById('folio-feedback')!.innerHTML =
                '<span class="text-red-500">Error al verificar el folio</span>';
            }
          });
        };

        // Configurar autocompletado para instituciones
        const setupInstitucionesAutocomplete = () => {
          const inputInstitucion = document.getElementById('swal-input-institucion-search') as HTMLInputElement;
          const hiddenInputInstitucion = document.getElementById('swal-input-institucion') as HTMLInputElement;
          const dropdownInstitucion = document.getElementById('instituciones-dropdown') as HTMLDivElement;
          const dropdownList = dropdownInstitucion.querySelector('ul')!;

          // Función para filtrar instituciones
          const filterInstituciones = (value: string) => {
            if (!value) {
              // Si no hay valor, mostrar las primeras 100 instituciones
              filteredInstitutions = instituciones.slice(0, 100);
            } else {
              // Filtrar por el texto ingresado
              const searchValue = value.toLowerCase().trim();
              filteredInstitutions = instituciones.filter(inst =>
                inst.name.toLowerCase().includes(searchValue)
              );
            }

            // Crear elementos de la lista
            dropdownList.innerHTML = '';
            if (filteredInstitutions.length === 0) {
              const li = document.createElement('li');
              li.className = 'py-2 px-3 text-gray-500 italic';
              li.textContent = 'No se encontraron coincidencias';
              dropdownList.appendChild(li);
            } else {
              filteredInstitutions.forEach(inst => {
                const li = document.createElement('li');
                li.className = 'py-2 px-3 hover:bg-blue-100 cursor-pointer';
                li.textContent = inst.name;
                li.onclick = () => {
                  inputInstitucion.value = inst.name;
                  hiddenInputInstitucion.value = inst.name;
                  dropdownInstitucion.classList.add('hidden');
                };
                dropdownList.appendChild(li);
              });
            }
          };

          // Evento focus
          inputInstitucion.onfocus = () => {
            filterInstituciones(inputInstitucion.value);
            dropdownInstitucion.classList.remove('hidden');
          };

          // Evento input
          inputInstitucion.oninput = () => {
            filterInstituciones(inputInstitucion.value);
            dropdownInstitucion.classList.remove('hidden');
          };

          // Cerrar dropdown al hacer click fuera
          document.addEventListener('click', (event) => {
            if (!inputInstitucion.contains(event.target as Node) &&
                !dropdownInstitucion.contains(event.target as Node)) {
              dropdownInstitucion.classList.add('hidden');
            }
          });
        };

        // Configurar autocompletado para instrumentos jurídicos
        const setupInstrumentosAutocomplete = () => {
          const inputInstrumento = document.getElementById('swal-input-instrumento-juridico-search') as HTMLInputElement;
          const hiddenInputInstrumento = document.getElementById('swal-input-instrumento-juridico') as HTMLInputElement;
          const dropdownInstrumento = document.getElementById('instrumentos-dropdown') as HTMLDivElement;
          const dropdownList = dropdownInstrumento.querySelector('ul')!;

          // Función para filtrar instrumentos
          const filterInstrumentos = (value: string) => {
            if (!value) {
              // Si no hay valor, mostrar todos los instrumentos (suelen ser pocos)
              filteredInstrumentos = instrumentosJuridicos;
            } else {
              // Filtrar por el texto ingresado
              const searchValue = value.toLowerCase().trim();
              filteredInstrumentos = instrumentosJuridicos.filter(inst =>
                inst.name.toLowerCase().includes(searchValue)
              );
            }

            // Crear elementos de la lista
            dropdownList.innerHTML = '';
            if (filteredInstrumentos.length === 0) {
              const li = document.createElement('li');
              li.className = 'py-2 px-3 text-gray-500 italic';
              li.textContent = 'No se encontraron coincidencias';
              dropdownList.appendChild(li);
            } else {
              filteredInstrumentos.forEach(inst => {
                const li = document.createElement('li');
                li.className = 'py-2 px-3 hover:bg-blue-100 cursor-pointer';
                li.textContent = inst.name;
                li.onclick = () => {
                  inputInstrumento.value = inst.name;
                  hiddenInputInstrumento.value = inst.name;
                  dropdownInstrumento.classList.add('hidden');
                };
                dropdownList.appendChild(li);
              });
            }
          };

          // Evento focus
          inputInstrumento.onfocus = () => {
            filterInstrumentos(inputInstrumento.value);
            dropdownInstrumento.classList.remove('hidden');
          };

          // Evento input
          inputInstrumento.oninput = () => {
            filterInstrumentos(inputInstrumento.value);
            dropdownInstrumento.classList.remove('hidden');
          };

          // Cerrar dropdown al hacer click fuera
          document.addEventListener('click', (event) => {
            if (!inputInstrumento.contains(event.target as Node) &&
                !dropdownInstrumento.contains(event.target as Node)) {
              dropdownInstrumento.classList.add('hidden');
            }
          });
        };

        // Agregar event listeners para año y folio
        const anioInput = document.getElementById('swal-input-anio') as HTMLInputElement;
        const folioInput = document.getElementById('swal-input-folio') as HTMLInputElement;

        // Inicialización: obtener el último folio para el año actual o guardado
        const yearToUse = parseInt(initialValues.anio.toString(), 10) || currentYear;
        updateFolioInfo(yearToUse);

        // Event listener para cambios en el año
        anioInput.addEventListener('change', () => {
          const year = parseInt(anioInput.value, 10);
          if (year) {
            updateFolioInfo(year);
            // Si ya hay un folio ingresado, validarlo
            if (folioInput.value) {
              validarFolio(year, parseInt(folioInput.value, 10));
            }
          }
        });

        // Event listener para cambios en el folio
        folioInput.addEventListener('input', () => {
          const year = parseInt(anioInput.value, 10);
          const folio = parseInt(folioInput.value, 10);
          if (year && folio) {
            validarFolio(year, folio);
          }
        });

        // Inicializar los autocompletados
        setupInstitucionesAutocomplete();
        setupInstrumentosAutocomplete();

        // Mostrar un mensaje si no hay catálogos
        if (instituciones.length === 0 || instrumentosJuridicos.length === 0) {
          const warningDiv = document.createElement('div');
          warningDiv.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4';
          warningDiv.innerHTML = `
            <p class="text-sm text-yellow-700">
              <strong>Advertencia:</strong> ${
                instituciones.length === 0 && instrumentosJuridicos.length === 0
                  ? 'No se pudieron cargar los catálogos de instituciones e instrumentos jurídicos.'
                  : instituciones.length === 0
                    ? 'No se pudieron cargar los catálogos de instituciones.'
                    : 'No se pudieron cargar los catálogos de instrumentos jurídicos.'
              } Verifica tu conexión.
            </p>
          `;
          document.querySelector('.swal2-content')?.appendChild(warningDiv);
        }
      },
      preConfirm: () => {
        // Verificar si hay validación de folio en progreso
        if (isCheckingFolio) {
          Swal.showValidationMessage('Por favor espera a que se complete la verificación del folio');
          return false;
        }

        // Validar si el folio ya existe
        if (folioExiste) {
          Swal.showValidationMessage('El folio ya existe para el año seleccionado');
          return false;
        }

        // Obtener todos los valores del formulario, incluyendo los hidden inputs
        const anio = (document.getElementById('swal-input-anio') as HTMLInputElement).value;
        const folio = (document.getElementById('swal-input-folio') as HTMLInputElement).value;
        const numOficio = (document.getElementById('swal-input-num-oficio') as HTMLInputElement).value;
        const fechaOficio = (document.getElementById('swal-input-fecha-oficio') as HTMLInputElement).value;
        const fechaRecepcion = (document.getElementById('swal-input-fecha-recepcion') as HTMLInputElement).value;
        const fechaVencimiento = (document.getElementById('swal-input-fecha-vencimiento') as HTMLInputElement).value;
        const horaRecepcion = (document.getElementById('swal-input-hora-recepcion') as HTMLInputElement).value;
        const instrumentoJuridico = (document.getElementById('swal-input-instrumento-juridico') as HTMLInputElement).value ||
                                   (document.getElementById('swal-input-instrumento-juridico-search') as HTMLInputElement).value;
        const remitente = (document.getElementById('swal-input-remitente') as HTMLInputElement).value;
        const institucion = (document.getElementById('swal-input-institucion') as HTMLInputElement).value ||
                           (document.getElementById('swal-input-institucion-search') as HTMLInputElement).value;
        const area = (document.getElementById('swal-input-area') as HTMLSelectElement).value;
        const asunto = (document.getElementById('swal-input-asunto') as HTMLTextAreaElement).value;
        const observacion = (document.getElementById('swal-input-observacion') as HTMLTextAreaElement).value;

        // Validar campos obligatorios
        if (!anio || !folio || !numOficio || !fechaOficio || !fechaRecepcion ||
            !fechaVencimiento || !instrumentoJuridico || !remitente || !institucion ||
            !area || !asunto) {
          Swal.showValidationMessage('Por favor completa todos los campos obligatorios');
          return false;
        }

        // Retornar el objeto con los datos del formulario
        return {
          anio: parseInt(anio, 10),
          folio: parseInt(folio, 10),
          num_oficio: numOficio,
          fecha_oficio: fechaOficio,
          fecha_recepcion: fechaRecepcion,
          fecha_vencimiento: fechaVencimiento,
          hora_recepcion: horaRecepcion || null,
          instrumento_juridico: instrumentoJuridico,
          remitente: remitente,
          institucion_origen: institucion,
          asignado: area,
          asunto: asunto,
          observacion: observacion || null,
          estatus: 'NO ATENDIDO'  // Valor por defecto
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        // Mostrar indicador de carga mientras se guarda
        Swal.fire({
          title: 'Guardando...',
          text: 'Creando nuevo registro',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Enviar datos al servicio
        this.inputService.createInput(result.value).subscribe({
          next: (response) => {
            // Limpiar datos guardados al tener éxito
            localStorage.removeItem(formStorageKey);

            Swal.fire({
              icon: 'success',
              title: '¡Registro creado!',
              text: `Se ha creado el registro con folio ${result.value.folio} para el año ${result.value.anio}`,
              confirmButtonText: 'Aceptar'
            });

            // Recargar datos
            this.loadInputs();
          },
          error: (error) => {
            console.error('Error al crear el registro:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Ha ocurrido un error al crear el registro',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        // Si el usuario cancela, no eliminamos los datos guardados para permitir retomar después
        console.log('Formulario cancelado, datos guardados para uso posterior');
      }
    });
  }

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
    // Validar que haya un año específico seleccionado
    if (this.currentYear === 'all') {
      this.alertService.warning('Por favor selecciona un año específico para ver las estadísticas');
      return;
    }

    // Asegurar que estamos usando el año seleccionado
    const yearToShow = parseInt(this.currentYear as unknown as string, 10);

    // Mostrar información de diagnóstico
    console.log(`Solicitando estadísticas para el año: ${yearToShow}`);

    Swal.fire({
      title: 'Cargando estadísticas',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();

        // Usar el servicio para obtener TODOS los datos de estadísticas (sin filtrar por año)
        this.inputService.getEstadisticasRegistros()
          .subscribe({
            next: (response: AreasStatsResponse) => {
              console.log(`Respuesta recibida para año ${yearToShow}:`, response);

              Swal.close();

              // La respuesta contiene los datos de todos los años, pero mostraremos solo el año seleccionado
              this.mostrarEstadisticas(response.data, yearToShow);
            },
            error: (error) => {
              console.error(`Error al obtener estadísticas para año ${yearToShow}:`, error);
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

    // Título y subtítulo con el año seleccionado
    htmlContent += `<h3 style="margin-bottom:15px;">Estadísticas de Registros por Área</h3>`;
    htmlContent += `<p style="margin-bottom:20px;"><strong>Año: ${selectedYear}</strong></p>`;

    // Tabla de estadísticas
    htmlContent += '<table class="stats-table" style="width:100%; border-collapse:collapse; min-width:800px;">';

    // Encabezados
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

    // Procesar los datos para el año seleccionado
    if (Array.isArray(datos)) {
      datos.forEach(direccion => {
        // Obtener datos para el año seleccionado
        const datosAnio = this.obtenerDatosAnioActual(direccion, selectedYear);

        // Calcular totales
        const total = datosAnio.atendido + datosAnio.noAtendido;

        // Calcular porcentaje basado en respuestas registradas
        const porcentajeAtencion = total > 0
          ? Math.round((datosAnio.respuestaRegistrada / total) * 100)
          : 0;

        // Determinar el color según el porcentaje
        const color = porcentajeAtencion >= 75
          ? 'green'
          : porcentajeAtencion >= 50
            ? '#f59e0b'
            : 'red';

        // Actualizar totales generales
        totalRegistros += total;
        totalAtendidos += datosAnio.atendido;
        totalNoAtendidos += datosAnio.noAtendido;
        totalRespuestasRegistradas += datosAnio.respuestaRegistrada;

        htmlContent += `
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:10px 16px; border:1px solid #ddd;">${direccion.direccion}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${total}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnio.atendido}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnio.noAtendido}</td>
            <td style="padding:10px 16px; text-align:center; border:1px solid #ddd;">${datosAnio.respuestaRegistrada}</td>
            <td style="padding:10px 16px; text-align:center; font-weight:bold; border:1px solid #ddd; color:${color};">
              ${porcentajeAtencion}%
            </td>
          </tr>
        `;
      });
    } else {
      htmlContent += `
        <tr>
          <td colspan="6" style="padding:8px; text-align:center;">No hay datos disponibles para el año ${selectedYear}</td>
        </tr>
      `;
    }

    // Calcular porcentaje global
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

    // Resumen anual
    htmlContent += `
      <div style="margin-top:20px; padding:15px; background-color:#f9fafb; border-radius:5px; border:1px solid #e5e7eb;">
        <h4 style="margin-top:0;">Resumen del Año ${selectedYear}</h4>
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

    htmlContent += '</div>';

    // Mostrar estadísticas
    Swal.fire({
      title: `Estadísticas de Áreas - ${selectedYear}`,
      html: htmlContent,
      width: 1100,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3085d6',
      customClass: {
        container: 'swal-wide-container',
        popup: 'swal-wide-popup'
      }
    });
  }

  /**
   * Obtiene los datos del año seleccionado de una dirección
   */
  private obtenerDatosAnioActual(direccion: any, selectedYear: number): { atendido: number, noAtendido: number, respuestaRegistrada: number } {
    // Valores predeterminados en caso de que no se encuentren datos
    const datosDefault = { atendido: 0, noAtendido: 0, respuestaRegistrada: 0 };

    if (!direccion.anios || !Array.isArray(direccion.anios)) {
      return datosDefault;
    }

    // Buscar el año seleccionado dentro del array de años
    const anioData = direccion.anios.find((anio: any) => anio.anio === selectedYear);

    // Si no encontró el año, devolver valores por defecto
    if (!anioData || !anioData.meses || !Array.isArray(anioData.meses)) {
      return datosDefault;
    }

    // Sumar los totales de todos los meses para el año seleccionado
    return anioData.meses.reduce((total: any, mes: any) => {
      return {
        atendido: total.atendido + (mes.atendido || 0),
        noAtendido: total.noAtendido + (mes.noAtendido || 0),
        respuestaRegistrada: total.respuestaRegistrada + (mes.respuestaRegistrada || 0)
      };
    }, datosDefault);
  }

  /**
   * Genera un reporte diario basado en el área y fecha seleccionados
   */
  generarReporteDiario(): void {
    if (!this.checkPermission('admin')) return;

    // El resto del método continúa igual...
    // Verificar que los filtros requeridos estén presentes
    if (!this.filterValues['asignado'] || !this.filterValues['fecha_recepcion']) {
      this.alertService.warning('Debe seleccionar un área y una fecha para generar el reporte diario');
      return;
    }

    // Formatear la fecha
    const fechaFormateada = this.obtenerFechaFormateada(this.filterValues['fecha_recepcion']);
    if (!fechaFormateada) return;

    // Mostrar indicador de carga
    this.isExporting = true;
    Swal.fire({
      title: 'Generando reporte diario',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Corrección: Usar 'fechaInicio' en lugar de 'fecha'
    const params = {
      area: this.filterValues['asignado'],
      fechaInicio: fechaFormateada
    };

    // Llamar al servicio
    this.inputService.generarReporteDiario(params)
      .pipe(
        finalize(() => {
          this.isExporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          // Cerrar el modal de carga
          Swal.close();

          // Generar nombre de archivo
          const nombreArea = params.area.replace(/\s+/g, '_');
          const fileName = `Reporte_Diario_${nombreArea}_${params.fechaInicio}.xlsx`;

          // Descargar el archivo
          saveAs(blob, fileName);

          // Mostrar mensaje de éxito
          this.alertService.success('Reporte diario generado correctamente');
        },
        error: (error) => {
          console.error('Error al generar reporte diario:', error);
          Swal.close();
          this.alertService.error('Error al generar el reporte diario');
        }
      });
  }

  /**
   * Genera un reporte resumen basado en la fecha seleccionada
   */
  generarReporteResumen(): void {
    // Verificar que la fecha esté seleccionada
    if (!this.filterValues['fecha_recepcion']) {
      this.alertService.warning('Debe seleccionar una fecha para generar el reporte resumen');
      return;
    }

    // Formatear la fecha
    const fechaFormateada = this.obtenerFechaFormateada(this.filterValues['fecha_recepcion']);
    if (!fechaFormateada) return;

    // Mostrar indicador de carga
    this.isExporting = true;
    Swal.fire({
      title: 'Generando reporte resumen',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Llamar al servicio con la fechaInicio correcta
    this.inputService.generarReporteResumen(fechaFormateada)
      .pipe(
        finalize(() => {
          this.isExporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          // Cerrar el modal de carga
          Swal.close();

          // Generar nombre de archivo
          const fileName = `Reporte_Resumen_${fechaFormateada}.xlsx`;

          // Descargar el archivo
          saveAs(blob, fileName);

          // Mostrar mensaje de éxito
          this.alertService.success('Reporte resumen generado correctamente');
        },
        error: (error) => {
          console.error('Error al generar reporte resumen:', error);
          Swal.close();
          this.alertService.error('Error al generar el reporte resumen');
        }
      });
  }

  /**
   * Convierte una fecha del formato DD/MM/YYYY al formato YYYY-MM-DD
   * @param fecha Fecha en formato DD/MM/YYYY
   * @returns Fecha en formato YYYY-MM-DD o la fecha original si no cumple el formato
   */
  private convertirFormatoFecha(fecha: string): string {
    if (!fecha) return '';

    // Verificar si la fecha ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }

    // Verificar si la fecha está en formato DD/MM/YYYY
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = fecha.match(regex);

    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    // Si no se pudo convertir, devolver la fecha original
    return fecha;
  }

  /**
   * Valida y formatea fecha de forma más robusta para los reportes
   */
  private obtenerFechaFormateada(fecha: string | undefined): string | null {
    if (!fecha) return null;

    try {
      // Intentar convertir la fecha a formato YYYY-MM-DD
      const fechaFormateada = this.convertirFormatoFecha(fecha);

      // Verificar que sea una fecha válida
      const fechaObj = new Date(fechaFormateada);
      if (isNaN(fechaObj.getTime())) {
        throw new Error('Fecha inválida');
      }

      return fechaFormateada;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      this.alertService.warning('El formato de fecha no es válido. Use DD/MM/YYYY o YYYY-MM-DD');
      return null;
    }
  }

  /**
   * Maneja la selección de una institución del autocompletado
   */
  onInstitutionSelected(event: any): void {
    const selectedInstitution = event.option.value;
    this.filterValues['institucion_origen'] = selectedInstitution;

    // Actualizar para debug
    console.log('Institución seleccionada:', selectedInstitution);
  }

  /**
   * Genera una tarjeta resumen basada en la fecha seleccionada y filtrada según permisos de usuario
   */
  generarTarjetaResumen(): void {
    // Verificar que la fecha esté seleccionada
    if (!this.filterValues['fecha_recepcion']) {
      this.alertService.warning('Debe seleccionar una fecha para generar la tarjeta resumen');
      return;
    }

    // Formatear la fecha
    const fechaFormateada = this.obtenerFechaFormateada(this.filterValues['fecha_recepcion']);
    if (!fechaFormateada) return;

    // Mostrar indicador de carga
    this.isExporting = true;
    Swal.fire({
      title: 'Generando tarjeta resumen',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Preparar parámetros según el rol y permisos del usuario
    const params: any = {
      fecha: fechaFormateada
    };

    // Filtrar por área según el rol:
    // - Administradores: sin filtro (todos)
    // - Directores generales: sus áreas asignadas
    // - Directores/enlaces: solo su área
    if (!this.isAdmin) {
      if (this.isDirectorGeneral) {
        // Para directores generales, obtener las áreas permitidas
        const areasPermitidas = this.permissionsService.getAreasByRole(RolesEnum.DIRECTOR_GENERAL, this.userArea);
        if (areasPermitidas && areasPermitidas.length > 0) {
          params.areas = areasPermitidas;
        }
      } else {
        // Para directores y enlaces, solo su área
        params.area = this.userArea;
      }
    }

    // Llamar al servicio con los parámetros adecuados
    this.inputService.generarTarjetaResumen(params)
      .pipe(
        finalize(() => {
          this.isExporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          // Cerrar el modal de carga
          Swal.close();

          // Generar nombre de archivo
          let nombreArchivo = `Tarjeta_Resumen_${fechaFormateada}`;

          //```typescript
          // Agregar información de área si aplica
          if (params.area) {
            const areaNormalizada = params.area.replace(/\s+/g, '_');
            nombreArchivo += `_${areaNormalizada}`;
          }
          nombreArchivo += '.xlsx';

          // Descargar el archivo
          saveAs(blob, nombreArchivo);

          // Mostrar mensaje de éxito
          this.alertService.success('Tarjeta resumen generada correctamente');
        },
        error: (error) => {
          console.error('Error al generar tarjeta resumen:', error);
          Swal.close();
          this.alertService.error('Error al generar la tarjeta resumen');
        }
      });
  }

  /**
   * Verifica si el usuario tiene permiso para una acción específica
   * @param permissionType Tipo de permiso a verificar
   * @returns true si tiene permiso, false en caso contrario
   */
  private checkPermission(permissionType: 'admin' | 'director-general' | 'director'): boolean {
    switch (permissionType) {
      case 'admin':
        if (!this.isAdmin) {
          this.alertService.error('No tienes permisos para realizar esta acción');
          return false;
        }
        return true;
      case 'director-general':
        if (!this.isAdmin && !this.isDirectorGeneral) {
          this.alertService.error('No tienes permisos para realizar esta acción');
          return false;
        }
        return true;
      case 'director':
        if (!this.isAdmin && !this.isDirectorGeneral && !this.isDirector) {
          this.alertService.error('No tienes permisos para realizar esta acción');
          return false;
        }
        return true;
      default:
        return true;
    }
  }
}
