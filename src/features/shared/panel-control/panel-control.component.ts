import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { InputService } from '../../../core/services/input.service';
import { Input } from '../../../core/models/input.model';
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
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Institution } from '../../../core/models/institution.model';
import { Instrument } from '../../../core/models/instrument.model';
import { InstrumentsComponent } from '../instruments/instruments.component';
import { InstitutionsComponent } from '../institutions/institutions.component';
import { ReportesService } from '../../../core/services/reportes.service';
import saveAs from 'file-saver';

@Component({
  selector: 'app-panel-control',
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
    InstrumentsComponent,
    InstitutionsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  standalone: true,
  templateUrl: './panel-control.component.html',
  styleUrl: './panel-control.component.scss'
})
export class PanelControlComponent implements OnInit {

  public currentYear: number = new Date().getFullYear();
  institutions: Institution[] = [];
  instruments: Instrument[] = [];

  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['actions', 'folio', 'num_oficio', 'fecha_recepcion', 'asignado', 'asunto', 'atencion_otorgada'];
  dataSource!: MatTableDataSource<Input>;
  inputs: Input[] = [];
  totalInputs: number = 0;
  totalPages: number = 0;
  currentPage: number = 1;
  pageSize: number = 50;
  pageSizeOptions: number[] = [50, 100, 300, 500];
  startDate!: Date;
  endDate!: Date;

  constructor(
    private inputService: InputService,
    private _liveAnnouncer: LiveAnnouncer,
    private datePipe: DatePipe,
    private _tokenStorage: TokenStorageService,
    private router: Router,
    private _reportes: ReportesService
  ) {

  }

  ngOnInit(): void {
    this.loadInputs();

    this.isLoggedIn = !!this._tokenStorage.getToken();
    if (this.isLoggedIn) {
      const user = this._tokenStorage.getUser();
      this.roles = user.roles;
      this.showAdmin = this.roles.includes('ROLE_ADMIN');
      this.showLinker = this.roles.includes('ROLE_LINKER');
      this.showModerator = this.roles.includes('ROLE_MODERATOR');
      this.username = user.username;
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

  loadInputs() {
    const user = this._tokenStorage.getUser();
    if (user.roles.includes('ROLE_ADMIN') || user.roles.includes('ROLE_MODERATOR')) {
      this.inputService.getNoDeletedInputsPreviousYers().subscribe({
        next: (response) => {
          this.inputs = response.inputs;
          this.totalInputs = response.totalInputs;
          this.totalPages = response.totalPages;
          this.dataSource = new MatTableDataSource(this.inputs);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
            console.error(err);
        }
      });
    } else {
      const areaUser = user.area;
      this.inputService.getNoDeletedInputsPreviousYearsByNormalUsers(areaUser).subscribe({
        next: (response) => {
          this.inputs = response.inputs;
          this.totalInputs = response.totalInputs;
          this.totalPages = response.totalPages;
          this.dataSource = new MatTableDataSource(this.inputs);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
            console.error(err);
        }
    });
    }
  }

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLocaleLowerCase();

    this.dataSource.filterPredicate = (data: Input, filter: string): boolean => {
      const filterNumber = Number(filter);

      if (!isNaN(filterNumber)) {
        const formattedDate = this.datePipe.transform(data.fecha_recepcion, 'dd/MM/yyyy') || '';
        return data.folio === filterNumber || formattedDate.toLocaleLowerCase().includes(filter);
      } else {
        // Si el filtro NO es un número:
        return this.displayedColumns.some(column => {
          if (column === 'fecha_recepcion') {
            const formattedDate = this.datePipe.transform(data.fecha_recepcion, 'dd/MM/yyyy') || '';
            return formattedDate.toLocaleLowerCase().includes(filter);
          } else if (column === 'folio') {
            return data.folio?.toString().toLocaleLowerCase().includes(filter);
          } else if (data[column as keyof Input]) {
            return data[column as keyof Input]?.toString().toLocaleLowerCase().includes(filter);
          }
          return false;
        });
      }
    };

    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filterByDateRange() {
    console.log(this.startDate, this.endDate)
    if (this.startDate && this.endDate) {
      const filteredData = this.inputs.filter(row => {
        const rowDate = new Date(row.fecha_recepcion);
        return rowDate >= this.startDate && rowDate <= this.endDate;
      });
      this.dataSource.data = filteredData;
      this.dataSource.paginator?.firstPage(); // Reiniciar paginador
    } else {
        this.dataSource.data = this.inputs; // Restablecer a los datos originales si no hay rango
        this.dataSource.paginator?.firstPage(); // Reiniciar paginador
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
      this._reportes.exportarExcelTodosAniosPosteriores().subscribe({
        next: (blob) => {
          const blobData = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blobData, 'Registros_anios_posteriores.xlsx');
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
    this._reportes.exportarExcelEnlaceAniosPosteriores(areaUser).subscribe({
      next: (blob) => {
        const blobData = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blobData, 'Registros_enlace_anios_posteriores.xlsx');
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
