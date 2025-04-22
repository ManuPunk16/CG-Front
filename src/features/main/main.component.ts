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
          // Utilizar el valor procesado para ordenamiento
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

      console.log('Áreas permitidas para el usuario:', {
        userRole: currentUser.roles,
        userArea: this.userArea,
        allowedAreas: this.userAllowedAreas
      });

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

    console.log(`Áreas disponibles para filtrar (${this.areas.length}):`, this.areas);

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

    console.log('Parámetros de búsqueda completos:', params);

    // Llamar al servicio...
    this.inputService.getInputs(params)
      .pipe(
        takeUntil(this.destroy$),
        tap(response => {
          console.log('Respuesta del servidor:', response);

          // Agrega esta línea para comparar (ahora correctamente tipada)
          console.log('Filtros aplicados vs. filtros devueltos:', {
            enviados: params,
            recibidos: response.data.filters
          });

          if (response && response.data) {
            // Acceder directamente a los inputs
            const inputs = response.data.inputs || [];

            this.dataSource.data = inputs.map((input: Input) => ({
              ...input,
              atencion_otorgada_visual: this.getAtencionOtorgada(input),
              diasAtraso: this.calcularDiasAtraso(input),
              colorSemaforo: this.getColorSemaforo(input)
            }));

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
   * Calcula los días de atraso para el semáforo
   */
  calcularDiasAtraso(input: Input): number {
    if (input.estatus === EstatusEnum.ATENDIDO) return 0;
    if (!input.fecha_recepcion) return -1; // Usando -1 para "N/A"

    const hoy = new Date();
    const fechaRecepcion = new Date(input.fecha_recepcion);
    const diff = Math.floor((hoy.getTime() - fechaRecepcion.getTime()) / (1000 * 60 * 60 * 24));

    return diff;
  }

  /**
   * Muestra el texto para días de atraso
   */
  getDiasAtrasoText(input: Input): string {
    const dias = input.diasAtraso;
    if (dias === -1) return 'N/A';
    return dias?.toString() || '';
  }

  /**
   * Devuelve el color del semáforo basado en los días de atraso
   */
  getColorSemaforo(input: Input): string {
    if (input.estatus === EstatusEnum.ATENDIDO) return 'bg-green-500';

    const dias = this.calcularDiasAtraso(input);
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
      window.open(`/ficha_tecnica/${input._id}`, '_blank');
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
}
