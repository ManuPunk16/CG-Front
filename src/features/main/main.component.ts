import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { EditarEntradaComponent } from '../shared/editar-entrada/editar-entrada.component';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { EditarSeguimientoComponent } from '../shared/editar-seguimiento/editar-seguimiento.component';
import { MatButtonModule } from '@angular/material/button';
import { NuevaEntradaComponent } from '../shared/nueva-entrada/nueva-entrada.component';
import { Router } from '@angular/router';

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
    MatButtonModule
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
export class MainComponent implements OnInit {

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
    private _matDialog: MatDialog,
    private _tokenStorage: TokenStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInputs();

    this.isLoggedIn = !!this._tokenStorage.getToken();
    if (this.isLoggedIn) {
      const user = this._tokenStorage.getUser();
      this.roles = user.roles;
      // console.log(this.roles);
      this.showAdmin = this.roles.includes('ROLE_ADMIN');
      this.showLinker = this.roles.includes('ROLE_LINKER');
      this.showModerator = this.roles.includes('ROLE_MODERATOR');
      this.username = user.username;
    }
  }

  loadInputs() {
    this.inputService.getNoDeletedInputs().subscribe({
        next: (response) => {
            this.inputs = response.inputs;
            this.totalInputs = response.totalInputs;
            this.totalPages = response.totalPages;
            this.dataSource = new MatTableDataSource(this.inputs);
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            // console.log(this.inputs);
        },
        error: (err) => {
            console.error(err);
        }
    });
  }

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  // applyFilter(event: Event): void {
  //   const filter = (event.target as HTMLInputElement).value.trim().toLocaleLowerCase();
  //   this.dataSource.filter = filter;
  //   if (this.dataSource.paginator) {
  //     this.dataSource.paginator.firstPage();
  //   }
  // }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLocaleLowerCase();

    this.dataSource.filterPredicate = (data: Input, filter: string): boolean => {
      const filterNumber = Number(filter);

      if (!isNaN(filterNumber)) {
        // Si el filtro es un número:
        // 1. Busca coincidencia EXACTA en el folio.
        // 2. Busca coincidencia (contiene) en fecha_recepcion (formateada).
        const formattedDate = this.datePipe.transform(data.fecha_recepcion, 'dd/MM/yyyy') || '';
        return data.folio === filterNumber || formattedDate.toLocaleLowerCase().includes(filter);
      } else {
        // Si el filtro NO es un número:
        return this.displayedColumns.some(column => {
          if (column === 'fecha_recepcion') {
            const formattedDate = this.datePipe.transform(data.fecha_recepcion, 'dd/MM/yyyy') || '';
            return formattedDate.toLocaleLowerCase().includes(filter);
          } else if (column === 'folio') {
            // Busca coincidencia (contiene) en el folio (convertido a string).
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
}
