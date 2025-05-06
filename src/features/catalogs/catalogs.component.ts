import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTable } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';

import { takeUntil, finalize, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { ApiResponse } from '../../core/models/api-response.model';
import { Catalog } from '../../core/models/catalog.model';
import { AlertService } from '../../core/services/ui/alert.service';
import { CatalogService } from '../../core/services/api/catalog.service';
import { CatalogType } from '../../core/models/enums/catalog.enum';

interface CatalogViewModel {
  _id: string;
  name: string;
  type: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-catalogs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './catalogs.component.html',
  styleUrls: ['./catalogs.component.scss']
})
export class CatalogsComponent implements OnInit, AfterViewInit, OnDestroy {
  // Viewchild para las tablas, paginación y ordenamiento
  @ViewChild('institutionTable') institutionTable!: MatTable<CatalogViewModel>;
  @ViewChild('institutionSort') institutionSort!: MatSort;
  @ViewChild('institutionPaginator') institutionPaginator!: MatPaginator;

  @ViewChild('instrumentTable') instrumentTable!: MatTable<CatalogViewModel>;
  @ViewChild('instrumentSort') instrumentSort!: MatSort;
  @ViewChild('instrumentPaginator') instrumentPaginator!: MatPaginator;

  // Servicios mediante inyección
  private catalogService = inject(CatalogService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  // Variables de control
  private destroy$ = new Subject<void>();
  isLoadingInstitutions = false;
  isLoadingInstruments = false;

  // Datos para las tablas
  institutionColumns: string[] = ['name', 'actions'];
  instrumentColumns: string[] = ['name', 'actions'];

  institutionData: CatalogViewModel[] = [];
  instrumentData: CatalogViewModel[] = [];

  // Guardar datos originales para filtrado
  institutionDataOriginal: CatalogViewModel[] = [];
  instrumentDataOriginal: CatalogViewModel[] = [];

  // Formularios para crear/editar
  institutionForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)])
  });

  instrumentForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)])
  });

  // Estado de edición
  editingInstitution: string | null = null;
  editingInstrument: string | null = null;

  readonly CatalogType = CatalogType;

  // Control de paginación
  pageSize = 10;
  totalInstitutions = 0;
  totalInstruments = 0;
  currentInstitutionFilter = '';
  currentInstrumentFilter = '';

  activeTab = 'institutions';

  ngOnInit(): void {
    // No cargar los catálogos aquí
  }

  ngAfterViewInit(): void {
    // Cargar datos después de que las vistas estén inicializadas
    setTimeout(() => {
      this.loadAllCatalogs();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga todos los catálogos disponibles
   */
  loadAllCatalogs(): void {
    this.loadInstitutions();
    this.loadInstruments();
  }

  /**
   * Carga el catálogo de instituciones con paginación
   */
  loadInstitutions(): void {
    this.isLoadingInstitutions = true;

    const params = {
      page: this.institutionPaginator?.pageIndex || 0,
      limit: this.institutionPaginator?.pageSize || 10,
      sortBy: this.institutionSort?.active || 'name',
      sortOrder: this.institutionSort?.direction || 'asc',
      search: this.currentInstitutionFilter || ''
    };

    this.catalogService.getCatalogItemsPaginated(CatalogType.INSTITUTION, params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingInstitutions = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.institution) {
            this.institutionData = response.institution;
            this.institutionDataOriginal = [...response.institution];

            if (response.pagination) {
              this.totalInstitutions = response.pagination.totalItems;
            }

            // Verificar que la tabla exista antes de renderizar filas
            setTimeout(() => {
              if (this.institutionTable) {
                this.institutionTable.renderRows();
              }
              this.cdr.detectChanges();
            });
          }
        },
        error: (error) => {
          console.error('Error al cargar instituciones:', error);
          this.alertService.error('Error al cargar el catálogo de instituciones');
        }
      });
  }

  /**
   * Carga el catálogo de instrumentos con paginación
   */
  loadInstruments(): void {
    this.isLoadingInstruments = true;

    const params = {
      page: this.instrumentPaginator?.pageIndex || 0,
      limit: this.instrumentPaginator?.pageSize || 10,
      sortBy: this.instrumentSort?.active || 'name',
      sortOrder: this.instrumentSort?.direction || 'asc',
      search: this.currentInstrumentFilter || ''
    };

    this.catalogService.getCatalogItemsPaginated(CatalogType.INSTRUMENT, params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingInstruments = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.instrument) {
            this.instrumentData = response.instrument;
            this.instrumentDataOriginal = [...response.instrument];

            if (response.pagination) {
              this.totalInstruments = response.pagination.totalItems;
            }

            // Verificar que la tabla exista antes de renderizar filas
            setTimeout(() => {
              if (this.instrumentTable) {
                this.instrumentTable.renderRows();
              }
              this.cdr.detectChanges();
            });
          }
        },
        error: (error) => {
          console.error('Error al cargar instrumentos:', error);
          this.alertService.error('Error al cargar el catálogo de instrumentos');
        }
      });
  }

  /**
   * Maneja el envío del formulario de institución
   */
  onSubmitInstitution(): void {
    if (this.institutionForm.invalid) {
      this.institutionForm.markAllAsTouched();
      return;
    }

    const name = this.institutionForm.get('name')?.value || '';

    if (this.editingInstitution) {
      this.updateCatalogItem(this.editingInstitution, CatalogType.INSTITUTION, name);
    } else {
      this.createCatalogItem(CatalogType.INSTITUTION, name);
    }
  }

  /**
   * Maneja el envío del formulario de instrumento
   */
  onSubmitInstrument(): void {
    if (this.instrumentForm.invalid) {
      this.instrumentForm.markAllAsTouched();
      return;
    }

    const name = this.instrumentForm.get('name')?.value || '';

    if (this.editingInstrument) {
      this.updateCatalogItem(this.editingInstrument, CatalogType.INSTRUMENT, name);
    } else {
      this.createCatalogItem(CatalogType.INSTRUMENT, name);
    }
  }

  /**
   * Crea un nuevo elemento en el catálogo
   */
  createCatalogItem(type: string, name: string): void {
    this.catalogService.createCatalogItem(type, name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Catalog>) => {
          if (response.status === 'success') {
            Swal.fire({
              title: 'Éxito',
              text: 'Elemento creado correctamente',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });

            // Resetear formulario y recargar datos
            if (type === CatalogType.INSTITUTION) {
              this.institutionForm.reset();
              this.loadInstitutions();
            } else {
              this.instrumentForm.reset();
              this.loadInstruments();
            }
          }
        },
        error: (error) => {
          console.error(`Error al crear elemento en catálogo ${type}:`, error);

          if (error.status === 409) {
            Swal.fire({
              title: 'Error',
              text: 'Ya existe un elemento con ese nombre en el catálogo',
              icon: 'error'
            });
          }
        }
      });
  }

  /**
   * Actualiza un elemento existente del catálogo
   */
  updateCatalogItem(id: string, type: string, name: string): void {
    this.catalogService.updateCatalogItem(id, { name, type })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<Catalog>) => {
          if (response.status === 'success') {
            Swal.fire({
              title: 'Éxito',
              text: 'Elemento actualizado correctamente',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });

            // Resetear formulario, cancelar edición y recargar datos
            if (type === CatalogType.INSTITUTION) {
              this.institutionForm.reset();
              this.editingInstitution = null;
              this.loadInstitutions();
            } else {
              this.instrumentForm.reset();
              this.editingInstrument = null;
              this.loadInstruments();
            }
          }
        },
        error: (error) => {
          console.error(`Error al actualizar elemento en catálogo ${type}:`, error);

          if (error.status === 409) {
            Swal.fire({
              title: 'Error',
              text: 'Ya existe otro elemento con ese nombre en el catálogo',
              icon: 'error'
            });
          }
        }
      });
  }

  /**
   * Configura el modo de edición para un elemento
   */
  editItem(item: CatalogViewModel): void {
    if (item.type === CatalogType.INSTITUTION) {
      this.editingInstitution = item._id;
      this.institutionForm.patchValue({ name: item.name });
    } else if (item.type === CatalogType.INSTRUMENT) {
      this.editingInstrument = item._id;
      this.instrumentForm.patchValue({ name: item.name });
    }
  }

  /**
   * Cancela la edición de un elemento
   */
  cancelEdit(type: string): void {
    if (type === CatalogType.INSTITUTION) {
      this.editingInstitution = null;
      this.institutionForm.reset();
    } else {
      this.editingInstrument = null;
      this.instrumentForm.reset();
    }
  }

  /**
   * Elimina un elemento del catálogo
   */
  deleteItem(item: CatalogViewModel): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el elemento "${item.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.catalogService.deleteCatalogItem(item._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: ApiResponse<void>) => {
              if (response.status === 'success') {
                Swal.fire({
                  title: 'Eliminado',
                  text: 'Elemento eliminado correctamente',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });

                // Recargar datos según el tipo
                if (item.type === CatalogType.INSTITUTION) {
                  this.loadInstitutions();
                } else {
                  this.loadInstruments();
                }
              }
            },
            error: (error) => {
              console.error(`Error al eliminar elemento en catálogo ${item.type}:`, error);
              Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el elemento',
                icon: 'error'
              });
            }
          });
      }
    });
  }

  /**
   * Aplica filtro de búsqueda a la tabla de instituciones
   */
  applyInstitutionFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.currentInstitutionFilter = filterValue.trim().toLowerCase();

    // Resetear a la primera página al filtrar
    if (this.institutionPaginator) {
      this.institutionPaginator.pageIndex = 0;
    }

    // Recargar datos con el nuevo filtro
    this.loadInstitutions();
  }

  /**
   * Aplica filtro de búsqueda a la tabla de instrumentos
   */
  applyInstrumentFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

    // Filtrar directamente los datos
    if (filterValue) {
      this.instrumentData = [...this.instrumentDataOriginal].filter(item =>
        item.name.toLowerCase().includes(filterValue)
      );
    } else {
      // Restaurar datos originales si no hay filtro
      this.instrumentData = [...this.instrumentDataOriginal];
    }

    // Resetear paginación al filtrar
    if (this.instrumentPaginator) {
      this.instrumentPaginator.firstPage();
    }

    // Redibujar tabla
    if (this.instrumentTable) {
      this.instrumentTable.renderRows();
    }

    this.cdr.detectChanges();
  }

  /**
   * Maneja el evento de cambio de página
   */
  onInstitutionPageChange(event: any): void {
    this.loadInstitutions();
  }

  /**
   * Maneja el evento de cambio de ordenamiento
   */
  onInstitutionSortChange(event: any): void {
    this.loadInstitutions();
  }

  /**
   * Maneja el evento de cambio de página para instrumentos
   */
  onInstrumentPageChange(event: any): void {
    this.loadInstruments();
  }

  /**
   * Maneja el evento de cambio de ordenamiento para instrumentos
   */
  onInstrumentSortChange(event: any): void {
    this.loadInstruments();
  }
}
