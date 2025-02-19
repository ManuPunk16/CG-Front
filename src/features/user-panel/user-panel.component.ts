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
import { AreaService } from '../../core/services/areas.service';
import { Area } from '../../core/models/area.model';

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

  startDate2: string = '';
  endDate2: string = '';
  estatus: string = 'ATENDIDO';

  selectedArea: string = '';
  areas: Area[] = [];

  isLoggedIn = false;
  private roles: string[] = [];
  username?: string;
  showAdmin = false;
  showLinker = false;
  showModerator = false;
  _isTrue = true;
  error: string | null = null;

  constructor(
    private _tokenStorage: TokenStorageService,
    private _reportes: ReportesService,
    private cdr: ChangeDetectorRef,
    private _area: AreaService
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
    this.getAreas();
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

  buscarReportes() {
    this._reportes.getAreasPerDay(this.fechaBusqueda)
      .subscribe({
        next: (data) => {
          this.reportes = data;
          this._isTrue = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error("Error en la solicitud:", error);

          if (error.status = 404) { // Verifica si el error es un 404
              Swal.fire({
                  icon: "info", // Icono de información
                  title: "Sin resultados",
                  text: "No se encontraron registros para los parámetros seleccionados."
              });
          } else if (error.error instanceof Blob) {
              const reader = new FileReader();
              reader.onload = (event: any) => {
                  try {
                      const errorData = JSON.parse(event.target.result);
                      console.error("Error del backend:", errorData);
                      let errorMessage = errorData.error;
                      if (Array.isArray(errorMessage)) {
                        errorMessage = errorMessage.join('\n');
                      }
                      if (errorMessage) {
                          Swal.fire({
                              icon: "error",
                              title: "Error",
                              text: errorMessage,
                          });
                      } else {
                          Swal.fire({
                              icon: "error",
                              title: "Oops...",
                              text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                          });
                      }
                  } catch (jsonError) {
                      console.error("Error al parsear JSON:", jsonError);
                      Swal.fire({
                          icon: "error",
                          title: "Oops...",
                          text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                      });
                  }
              };
              reader.readAsText(error.error);
          } else if (error.error && typeof error.error === 'string') {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: error.error
            });
          }
          else {
              Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
              });
          }
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
          console.error("Error en la solicitud:", error);

          if (error.status = 404) { // Verifica si el error es un 404
              Swal.fire({
                  icon: "info", // Icono de información
                  title: "Sin resultados",
                  text: "No se encontraron registros para los parámetros seleccionados."
              });
          } else if (error.error instanceof Blob) {
              const reader = new FileReader();
              reader.onload = (event: any) => {
                  try {
                      const errorData = JSON.parse(event.target.result);
                      console.error("Error del backend:", errorData);
                      let errorMessage = errorData.error;
                      if (Array.isArray(errorMessage)) {
                        errorMessage = errorMessage.join('\n');
                      }
                      if (errorMessage) {
                          Swal.fire({
                              icon: "error",
                              title: "Error",
                              text: errorMessage,
                          });
                      } else {
                          Swal.fire({
                              icon: "error",
                              title: "Oops...",
                              text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                          });
                      }
                  } catch (jsonError) {
                      console.error("Error al parsear JSON:", jsonError);
                      Swal.fire({
                          icon: "error",
                          title: "Oops...",
                          text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                      });
                  }
              };
              reader.readAsText(error.error);
          } else if (error.error && typeof error.error === 'string') {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: error.error
            });
          }
          else {
              Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
              });
          }
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
          console.error("Error en la solicitud:", error);

          if (error.status = 404) { // Verifica si el error es un 404
              Swal.fire({
                  icon: "info", // Icono de información
                  title: "Sin resultados",
                  text: "No se encontraron registros para los parámetros seleccionados."
              });
          } else if (error.error instanceof Blob) {
              const reader = new FileReader();
              reader.onload = (event: any) => {
                  try {
                      const errorData = JSON.parse(event.target.result);
                      console.error("Error del backend:", errorData);
                      let errorMessage = errorData.error;
                      if (Array.isArray(errorMessage)) {
                        errorMessage = errorMessage.join('\n');
                      }
                      if (errorMessage) {
                          Swal.fire({
                              icon: "error",
                              title: "Error",
                              text: errorMessage,
                          });
                      } else {
                          Swal.fire({
                              icon: "error",
                              title: "Oops...",
                              text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                          });
                      }
                  } catch (jsonError) {
                      console.error("Error al parsear JSON:", jsonError);
                      Swal.fire({
                          icon: "error",
                          title: "Oops...",
                          text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                      });
                  }
              };
              reader.readAsText(error.error);
          } else if (error.error && typeof error.error === 'string') {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: error.error
            });
          }
          else {
              Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
              });
          }
      }
      });
  }

  generarReporteEstatus() {
    const fechaInicio = this.startDate2;
    const fechaFin = this.endDate2;
    const estatus = this.estatus;
    const user = this._tokenStorage.getUser();
    const area = user.area;

    this._reportes.exportarDatosExcelPorEstatusFechaPorArea(estatus, area, fechaInicio, fechaFin)
      .subscribe({
          next: (blob) => {
              const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const filename = `Reporte_por_${estatus}_${formattedDate}.xlsx`;
              saveAs(blob, filename);
          },
          error: (error) => {
              console.error("Error en la solicitud:", error);

              if (error.status = 404) { // Verifica si el error es un 404
                  Swal.fire({
                      icon: "info", // Icono de información
                      title: "Sin resultados",
                      text: "No se encontraron registros para los parámetros seleccionados."
                  });
              } else if (error.error instanceof Blob) {
                  const reader = new FileReader();
                  reader.onload = (event: any) => {
                      try {
                          const errorData = JSON.parse(event.target.result);
                          console.error("Error del backend:", errorData);
                          let errorMessage = errorData.error;
                          if (Array.isArray(errorMessage)) {
                            errorMessage = errorMessage.join('\n');
                          }
                          if (errorMessage) {
                              Swal.fire({
                                  icon: "error",
                                  title: "Error",
                                  text: errorMessage,
                              });
                          } else {
                              Swal.fire({
                                  icon: "error",
                                  title: "Oops...",
                                  text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                              });
                          }
                      } catch (jsonError) {
                          console.error("Error al parsear JSON:", jsonError);
                          Swal.fire({
                              icon: "error",
                              title: "Oops...",
                              text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                          });
                      }
                  };
                  reader.readAsText(error.error);
              } else if (error.error && typeof error.error === 'string') {
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: error.error
                });
              }
              else {
                  Swal.fire({
                      icon: "error",
                      title: "Oops...",
                      text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                  });
              }
          }
      });
  }

  generarReporteEstatusPorArea() {
    const fechaInicio = this.startDate2;
    const fechaFin = this.endDate2;
    const estatus = this.estatus;
    const asignado = this.selectedArea;

    this._reportes.exportarDatosExcelPorEstatusFechaPorArea(estatus, asignado, fechaInicio, fechaFin)
      .subscribe({
          next: (blob) => {
              const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const filename = `Reporte_por_${estatus}_${formattedDate}.xlsx`;
              saveAs(blob, filename);
          },
          error: (error) => {
              console.error("Error en la solicitud:", error);

              if (error.status = 404) { // Verifica si el error es un 404
                  Swal.fire({
                      icon: "info", // Icono de información
                      title: "Sin resultados",
                      text: "No se encontraron registros para los parámetros seleccionados."
                  });
              } else if (error.error instanceof Blob) {
                  const reader = new FileReader();
                  reader.onload = (event: any) => {
                      try {
                          const errorData = JSON.parse(event.target.result);
                          console.error("Error del backend:", errorData);
                          let errorMessage = errorData.error;
                          if (Array.isArray(errorMessage)) {
                            errorMessage = errorMessage.join('\n');
                          }
                          if (errorMessage) {
                              Swal.fire({
                                  icon: "error",
                                  title: "Error",
                                  text: errorMessage,
                              });
                          } else {
                              Swal.fire({
                                  icon: "error",
                                  title: "Oops...",
                                  text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                              });
                          }
                      } catch (jsonError) {
                          console.error("Error al parsear JSON:", jsonError);
                          Swal.fire({
                              icon: "error",
                              title: "Oops...",
                              text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                          });
                      }
                  };
                  reader.readAsText(error.error);
              } else if (error.error && typeof error.error === 'string') {
                Swal.fire({
                  icon: "error",
                  title: "Oops...",
                  text: error.error
                });
              }
              else {
                  Swal.fire({
                      icon: "error",
                      title: "Oops...",
                      text: "Error al generar el reporte. Inténtalo de nuevo más tarde."
                  });
              }
          }
      });
  }
}
