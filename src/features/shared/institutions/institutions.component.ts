import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { Input } from '../../../core/models/input.model';
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
import { Institution } from '../../../core/models/institution.model';
import { InstitutionsService } from '../../../core/services/institutions.service';
import { InstitutionsDialogComponent } from '../institutions-dialog/institutions-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { InstitutionEditDialogComponent } from '../institution-edit-dialog/institution-edit-dialog.component';

@Component({
  selector: 'app-institutions',
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
  templateUrl: './institutions.component.html',
  styleUrl: './institutions.component.scss'
})
export class InstitutionsComponent implements OnInit {

  institutions: Institution[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  displayedColumns: string[] = ['actions', 'name'];
  dataSource!: MatTableDataSource<Institution>;

  constructor(
    private _liveAnnouncer: LiveAnnouncer,
    private _institutions: InstitutionsService,
    public _dialog: MatDialog
  ) {

  }

  ngOnInit(): void {
    this.getInstitutions();
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

  editInput(row: Input) {
    if (row._id) {
      const editInstitution = this._dialog.open(InstitutionEditDialogComponent, {
        width: '90%',
        id: row._id
      });

      editInstitution.afterClosed().subscribe(result => {});
    } else {
      console.error('El ID del registro es inválido');
    }
  }

  newInput() {
    // this.router.navigate(['/nueva-entrada']);
    const instutionDialog = this._dialog.open(InstitutionsDialogComponent, {
      width: '75%'
    });

    instutionDialog.afterClosed().subscribe(result => {

    });
  }

  getInstitutions() {
    this._institutions.getAllNoDeletedInstitutions().subscribe({
      next: (res) => {
        this.institutions = res;
        this.dataSource = new MatTableDataSource(this.institutions);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (error) => {
        console.error('Error al obtener las instituciones:', error);
      }
    });
  }
}
