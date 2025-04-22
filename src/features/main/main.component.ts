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
    DatePipe
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
  currentYear: number = new Date().getFullYear();
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

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadCatalogs();

    this.dataSource.sortingDataAccessor = (item: Input, property: string) => {
      switch (property) {
        case 'fecha_recepcion':
          return item.fecha_recepcion ? new Date(item.fecha_recepcion).getTime() : 0;
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
    }
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

    // Usar enumerado de áreas en lugar de cargar desde servicio
    this.areas = Object.values(AreasEnum);
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
   * Carga los inputs con paginación y filtros
   */
  loadInputs(): void {
    this.isLoadingResults = true;

    const params: InputQueryParams = {
      year: this.currentYear,
      page: this.paginator?.pageIndex || 0,
      limit: this.paginator?.pageSize || this.pageSize,
      sortBy: this.sort?.active || 'fecha_recepcion',
      sortOrder: this.sort?.direction || 'asc',
    };

    // Agregar filtros si existen
    Object.keys(this.filterValues).forEach(key => {
      if (this.filterValues[key]) {
        params[key] = this.filterValues[key];
      }
    });

    // Aplicar filtro por área si el usuario no es admin o director general
    if (!this.isAdmin && !this.isDirectorGeneral && this.userArea) {
      params.area = this.userArea;
    }

    this.inputService.getInputs(params)
      .pipe(
        takeUntil(this.destroy$),
        tap(response => {
          if (response && response.data) {
            // Acceder directamente a los datos (la interfaz debe actualizarse en InputService)
            const inputs = Array.isArray(response.data) ? response.data :
                          (response.data as any).inputs || [];

            this.dataSource.data = inputs.map((input: Input) => ({
              ...input,
              atencion_otorgada_visual: this.getAtencionOtorgada(input),
              diasAtraso: this.calcularDiasAtraso(input),
              colorSemaforo: this.getColorSemaforo(input)
            }));

            // Acceder a la información de paginación si existe
            const pagination = (response.data as any).pagination;
            if (pagination) {
              this.totalItems = pagination.totalItems || 0;
              this.currentPage = pagination.currentPage || 0;

              // Actualizamos la información del paginador sin recurrir a su evento interno
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
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadInputs();
  }

  /**
   * Limpia todos los filtros (modificar para incluir el control de institución)
   */
  clearFilters(): void {
    this.filterValues = {};
    this.institutionFilterControl.setValue('');
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadInputs();
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

  // No necesitamos los métodos de paginación personalizados ya que usamos MatPaginator
}
