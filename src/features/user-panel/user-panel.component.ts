import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { ReportesService } from '../../core/services/reportes.service';
import { NgFor, NgIf } from '@angular/common';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import Swal from 'sweetalert2';
import saveAs from 'file-saver';

@Component({
  selector: 'app-user-panel',
  imports: [
    MatCardModule,
    NgFor,
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
      provideNativeDateAdapter(),
      { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
    ],
  templateUrl: './user-panel.component.html',
  styleUrl: './user-panel.component.scss'
})
export class UserPanelComponent implements OnInit {

  reportes: any[] = [];
  fechaBusqueda: string = '';

  startDate: string = '';
  endDate: string = '';

  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;
  _isTrue = true;

  constructor(
    private _tokenStorage: TokenStorageService,
    private _reportes: ReportesService,
    private cdr: ChangeDetectorRef
  ) {
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

  ngOnInit(): void {

  }

  buscarReportes() {
    this._reportes.getAreasPerDay(this.fechaBusqueda)
      .subscribe({
        next: (data) => {
          this.reportes = data;
          this._isTrue = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al obtener los reportes:', error);
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Error al obtener los reportes"
          });
        }
      });
  }

  descargarReporte() {
    if (this.fechaBusqueda) {
      this._reportes.getReporteResumen(this.fechaBusqueda)
      .subscribe({
        next: (blob) => {
          const downloadURL = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadURL;
          const today = new Date();
          const formattedDate = today.toISOString().replace(/:/g, '-').replace(/\./g, '');
          const fileName = `reporte_resumen_${formattedDate}.xlsx`;
          link.download = fileName;
          link.click();
          window.URL.revokeObjectURL(downloadURL);
        },
        error: (error) => {
          console.error('Error al descargar el reporte:', error);
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Error al descargar el reporte"
          });
        }
      });
    }
  }

  generarReporte() {
    const fechaInicio = this.startDate;
    const fechaFin = this.endDate;

    this._reportes.exportarExcelFormatogenerarReporte(fechaInicio, fechaFin)
      .subscribe({
        next: (blob) => {
          saveAs(blob, 'reporte.xlsx');
        },
        error: (error) => {
          console.error(error);
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Debes de seleccionar una fecha primero!",
          });
        }
      });
  }
}
