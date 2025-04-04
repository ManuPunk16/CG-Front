import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { InputService } from '../../core/services/input.service';
import { Input } from '../../core/models/input.model';
import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ReportesService } from '../../core/services/reportes.service';
import saveAs from 'file-saver';
import { MatSelectModule } from '@angular/material/select';
import { EstatusEntrada } from '../../core/models/estatus.model';
import { InstitutionsService } from '../../core/services/institutions.service';
import { Institution } from '../../core/models/institution.model';
import { Area } from '../../core/models/area.model';
import { AreaService } from '../../core/services/areas.service';
import { catchError, map, Observable, of, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-main',
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatPaginatorModule,
    MatCardModule,
    MatDividerModule,
    DatePipe,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    NgIf,
    MatButtonModule,
    MatSelectModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  standalone: true,
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent implements OnInit, OnDestroy {

  public currentYear: number = new Date().getFullYear();

  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  @ViewChild(MatSort)
  sort!: MatSort;

  displayedColumns: string[] = [
    'actions', 'folio', 'fecha_recepcion', 'diasAtraso', 'num_oficio',
    'institucion_origen', 'remitente', 'asunto', 'asignado', 'atencion_otorgada_visual'
  ];
  dataSource!: MatTableDataSource<Input>;
  inputs: Input[] = [];
  totalInputs: number = 0;
  totalPages: number = 0;
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 300, 500];
  startDate!: Date;
  endDate!: Date;

  reportes: any[] = [];
  fechaBusqueda: string = '';

  institutions: Institution[] = [];
  areas: Area[] = [];

  searchFields: string[] = [
    'folio', 'fecha_recepcion', 'num_oficio', 'institucion_origen',
    'remitente', 'asunto', 'asignado', 'atencion_otorgada_visual', 'estatus'
  ];
  searchTerms: { [key: string]: string } = {};
  statusOptions = Object.values(EstatusEntrada);
  canEditAssignation: boolean = false;

  showEstadisticasButton: boolean = false;
  isEstadisticasButtonEnabled: boolean = false;
  areaSeleccionada: string = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private inputService: InputService,
    private _liveAnnouncer: LiveAnnouncer,
    private datePipe: DatePipe,
    private _tokenStorage: TokenStorageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private _reportes: ReportesService,
    private _institution: InstitutionsService,
    private _area: AreaService
  ) {
    this.currentYear;
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadInputs();
    this.checkUserRoles();
    this.getInstitutions();
    this.getAreas();
    this.cdr.detectChanges();
  }

  getRowClass(element: Input): string {
    switch (element.estatus) {
      case 'NO ATENDIDO':
        return 'badge badge-warning';
      case 'ATENDIDO':
        return 'badge badge-success';
      default:
        return 'badge badge-secondary';
    }
  }

  private checkUserRoles(): void {
    const user = this._tokenStorage.getUser();
    this.roles = user.roles || [];
    this.showAdmin = this.hasRole('ROLE_ADMIN');
    this.showLinker = this.hasRole('ROLE_LINKER');
    this.showModerator = this.hasRole('ROLE_MODERATOR');
    this.canEditAssignation = this.showAdmin || this.showModerator;
  }

  private hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  openRegistrosAtendidosModal() {
    const user = this._tokenStorage.getUser();
    this.inputService.getRegistrosAtendidosEstatusAreaAnio(user.area).subscribe({
      next: (response) => {
        this.showRegistrosAtendidosModal(response.data);
      },
      error: (error) => {
        console.error('Error al obtener registros atendidos:', error);
      }
    });
  }

  showRegistrosAtendidosModal(data: any[]) {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let content = '';
    data.forEach(item => {
      content += `<h3>${item.direccion}</h3>`;
      item.anios.forEach((anio: { anio: any; meses: any[]; }) => {
        content += `<h4>Año ${anio.anio}</h4>`;
        content += '<table><thead><tr><th>Mes</th><th>Atendido</th><th>No Atendido</th><th>Respuesta Registrada</th></tr></thead><tbody>';
        anio.meses.forEach(mes => {
          const nombreMes = nombresMeses[mes.mes - 1];
          content += `<tr><td>${nombreMes}</td><td>${mes.atendido}</td><td>${mes.noAtendido}</td><td>${mes.respuestaRegistrada}</td></tr>`;
        });
        content += '</tbody></table>';
      });
    });

    Swal.fire({
      title: 'Registros Atendidos',
      html: content,
      confirmButtonText: 'Cerrar',
      width: '80%',
      heightAuto: false,
    });
  }

  openRegistrosAtendidosModalFilter() {
    this.inputService.getRegistrosAtendidosEstatusAreaAnio(this.areaSeleccionada).subscribe({ // Usa areaSeleccionada
      next: (response) => {
        this.showRegistrosAtendidosModal(response.data);
      },
      error: (error) => {
        console.error('Error al obtener registros atendidos:', error);
      }
    });
  }

  onAsignadoChange() {
    this.areaSeleccionada = this.searchTerms['asignado'] || ''; // Actualiza areaSeleccionada
    if (this.areaSeleccionada) {
      this.showEstadisticasButton = true;
      this.isEstadisticasButtonEnabled = true;
    } else {
      this.showEstadisticasButton = false;
      this.isEstadisticasButtonEnabled = false;
    }
  }

  deleteById(row: Input) {
    console.log(row._id);
    Swal.fire({
      title: "Estas seguro de borrar el registro?",
      text: "No podras revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, borrar!"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Borrado!",
          text: "Tu archivo ha sido borrado con exito.",
          icon: "success"
        });
      }
    });
  }

  getInstitutions() {
    this._institution.getAllNoDeletedInstitutions().subscribe({
      next: (res) => {
        this.institutions = res;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }

  getAreas() {
    this._area.getAllAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al obtener las áreas:', error);
      }
    });
  }

  loadInputs() {
    const user = this._tokenStorage.getUser();
    const isAdminOrModerator = user.roles.includes('ROLE_ADMIN') || user.roles.includes('ROLE_MODERATOR');
    const data$ = isAdminOrModerator
      ? this.inputService.getNoDeletedInputs()
      : this.inputService.getNoDeletedInputsByNormalUsers(user.area);

    data$.pipe(
      map(response => {
        if (!response || !response.inputs) {
          console.warn('No se recibieron datos de entradas.');
          return [];
        }
        this.totalInputs = response.totalInputs;
        this.totalPages = response.totalPages;
        return response.inputs.map(input => ({
          ...input,
          atencion_otorgada_visual: this.getAtencionOtorgada(input.seguimientos)
        }));
      }),
      tap(inputs => {
        this.inputs = inputs;
        this.dataSource = new MatTableDataSource(this.inputs);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.cdr.detectChanges();
      }),
      catchError(err => {
        console.error('Error al cargar los inputs:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Ocurrió un error al cargar los registros.',
        });
        return of([]);
      }),
    ).subscribe();
  }

  getAtencionOtorgada(seguimientos: any): string {
    return seguimientos?.atencion_otorgada ? (seguimientos.atencion_otorgada.trim() === '' ? '-' : seguimientos.atencion_otorgada) : '-';
  }

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  applyFilters() {
    this.dataSource.filterPredicate = (data: Input, filter: string) => {
      let isValid = true;
      for (const field of this.searchFields) {
        const searchTerm = this.searchTerms[field]?.toLowerCase();
        const dataValue = data[field as keyof Input]?.toString().toLowerCase();

        if (searchTerm) {
          if (field === 'fecha_recepcion') {
            const formattedDate = this.datePipe.transform(data.fecha_recepcion, 'dd/MM/yyyy') || '';
            isValid = isValid && formattedDate.toLowerCase().includes(searchTerm);
          } else if (field === 'estatus') {
            isValid = isValid && dataValue === searchTerm;
          } else if (dataValue) {
            isValid = isValid && dataValue.includes(searchTerm);
          } else {
            isValid = false;
          }
        }
      }
      return isValid;
    };

    this.dataSource.filter = 'applied';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilter() {
    this.searchTerms = {};
    this.dataSource.filter = '';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  editInput(row: Input) {
    if (row._id) {
      this.router.navigate(['/editar-entrada', row._id]);
    } else {
      console.error('El ID del registro es inválido');
    }
  }

  editSeguimiento(row: Input) {
    if (row._id) {
      this.router.navigate(['/editar-seguimiento', row._id]);
    } else {
      console.error('El ID del registro es inválido');
    }
  }

  newInput() {
    this.router.navigate(['/nueva-entrada']);
  }

  tecnicalView(row: Input) {
    if (row._id) {
      window.open(`/ficha_tecnica/${row._id}`, '_blank');
    } else {
      console.error('El ID del registro es inválido');
    }
  }

  exportToExcelAll() {
    this._reportes.exportarExcelTodosAnioActual().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (blob) => {
        const blobData = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blobData, 'Registros_anio_actual.xlsx');
      },
      error: (error) => {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Algo salio mal!",
        });
      }
    });
  }

  exportToExcelEnlace() {
    const user = this._tokenStorage.getUser();
    const areaUser = user.area;
    this._reportes.exportarExcelEnlaceAnioActual(areaUser).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (blob) => {
        const blobData = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blobData, 'Registros_enlace_anio_actual.xlsx');
      },
      error: (error) => {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Algo salio mal!",
        });
      }
    });
  }
}
