import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { InstrumentsService } from '../../../core/services/instruments.service';
import { Instrument } from '../../../core/models/instrument.model';
import { InstrumentsDialogComponent } from '../instruments-dialog/instruments-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { InstrumentEditDialogComponent } from '../instrument-edit-dialog/instrument-edit-dialog.component';

@Component({
  selector: 'app-instruments',
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatPaginatorModule,
    MatCardModule,
    MatDividerModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    MatButtonModule
  ],
  standalone: true,
  templateUrl: './instruments.component.html',
  styleUrl: './instruments.component.scss'
})
export class InstrumentsComponent implements OnInit {

  instruments: Instrument[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  displayedColumns: string[] = ['actions', 'name'];
  dataSource!: MatTableDataSource<Instrument>;

  constructor(
    private _liveAnnouncer: LiveAnnouncer,
    private _instrument: InstrumentsService,
    public _dialog: MatDialog
  ) {

  }

  ngOnInit(): void {
    this.getInstruments();
  }

  deleteById(row: Instrument) {
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

  announceSortChange(sortState: Sort) {
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLocaleLowerCase();

    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  editDialog(row: Instrument) {
    if (row._id) {
      const editInstrument = this._dialog.open(InstrumentEditDialogComponent, {
        width: '90%',
        id: row._id
      });

      editInstrument.afterClosed().subscribe(result => {});
    } else {
      console.error('El ID del registro es inválido');
    }
  }

  newDialog() {
    // this.router.navigate(['/nueva-entrada']);
    const instrumentDialog = this._dialog.open(InstrumentsDialogComponent, {
      width: '75%'
    });

    instrumentDialog.afterClosed().subscribe(result => {});
  }

  getInstruments() {
    this._instrument.getAllNoDeletedInstruments().subscribe({
      next: (res) => {
        this.instruments = res;
        this.dataSource = new MatTableDataSource(this.instruments);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }
}
