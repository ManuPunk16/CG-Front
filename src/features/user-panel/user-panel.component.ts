import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { Input } from '../../core/models/input.model';
import { Chart, BarController, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip } from 'chart.js';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

Chart.register(BarController, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip);

interface TiempoRespuesta {
  promedio_dias: number | null;
  mediana_dias: number | null;
  percentil25_dias: number | null;
  percentil75_dias: number | null;
  desviacion_estandar_dias: number | null;
  total_atendidos: number | null;
  total_no_atendidos: number | null;
  total_oficios: number;
  datos_oficios: Input[]; // Puedes definir una interfaz más específica para los datos de los oficios
}

@Component({
  selector: 'app-user-panel',
  imports: [
    MatCardModule,
    NgFor,
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    DatePipe,
    RouterLink
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

  reporte: TiempoRespuesta = {
    promedio_dias: null,
    mediana_dias: null,
    percentil25_dias: null,
    percentil75_dias: null,
    desviacion_estandar_dias: null,
    total_atendidos: null,
    total_no_atendidos: null,
    total_oficios: 0,
    datos_oficios: [] // O un array vacío si aplica
  };
  area = 'DIRECCIÓN DE SERVICIOS LEGALES';
  startDate3: string = '';
  endDate3: string = '';
  selectedArea2: string = '';
  areaConsultada!: string;
  graficaActivada: boolean = false;

  selectedAreaReporteDiario: string = '';

  @ViewChild('myChart') myChart!: ElementRef; // Obtén una referencia al elemento canvas
  chart!: Chart;

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

  cargarReporteModerador() {
    const fechaInicio = this.startDate3;
    const fechaFin = this.endDate3;
    const asignado = this.selectedArea2;
    this.areaConsultada = asignado;

    this._reportes.calcularTiempoRespuestaTotal(asignado, fechaInicio, fechaFin).subscribe({
      next: (data: TiempoRespuesta) => {
        this.reporte = data;
        // console.log(this.reporte);
        this.crearGrafica();
        this.graficaActivada = true;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error("Error en la solicitud:", error);

        if (error.status = 404) { // Verifica si el error es un 404
            Swal.fire({
                icon: "info", // Icono de información
                title: "Sin resultados",
                text: "No se encontraron registros para los parámetros seleccionados."
            });
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

  cargarReporte() {
    const fechaInicio = this.startDate3;
    const fechaFin = this.endDate3;
    const user = this._tokenStorage.getUser();
    const area = user.area;
    this.areaConsultada = area;

    this._reportes.calcularTiempoRespuestaTotal(area, fechaInicio, fechaFin).subscribe({
      next: (data: TiempoRespuesta) => {
        this.reporte = data;
        this.crearGrafica();
        this.graficaActivada = true;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error("Error en la solicitud:", error);

        if (error.status = 404) { // Verifica si el error es un 404
            Swal.fire({
                icon: "info", // Icono de información
                title: "Sin resultados",
                text: "No se encontraron registros para los parámetros seleccionados."
            });
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

  crearGrafica() {
    if (this.chart) {
      this.chart.destroy(); // Destruye la instancia anterior si existe
    }

    const canvas = this.myChart.nativeElement.getContext('2d');

    this.chart = new Chart(canvas, {
      type: 'bar', // Tipo de gráfico (puedes cambiarlo)
      data: {
        labels: this.reporte?.datos_oficios?.map(oficio => oficio.num_oficio) ?? [],
        datasets: [{
          label: 'Diferencia en días',
          data: this.reporte?.datos_oficios?.map(oficio => oficio.diferencia_dias) ?? [],
          backgroundColor: this.reporte?.datos_oficios?.map(oficio => {
            return oficio.estatus === 'ATENDIDO' ? 'rgb(82, 255, 82)' : 'rgb(255, 41, 41)';
        }) ?? [],
          borderColor: 'rgba(54, 162, 235, 1)', // Color del borde de las barras
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Diferencia de dias entre la Fecha de Recepcion y la Fecha de Acuse de Recibido'
          },
          tooltip: { // <-- Configuración de tooltips
            callbacks: {
                label: (context) => {
                    const index = context.dataIndex;
                    const oficio = this.reporte.datos_oficios[index];

                    const tiempoRecepcion = new Date(oficio.tiempo_recepcion);
                    const tiempoRespuesta = new Date(oficio.tiempo_respuesta);

                    const formattedRecepcion = `${tiempoRecepcion.getDate()}/${tiempoRecepcion.getMonth() + 1}/${tiempoRecepcion.getFullYear()}`;
                    const formattedRespuesta = `${tiempoRespuesta.getDate()}/${tiempoRespuesta.getMonth() + 1}/${tiempoRespuesta.getFullYear()}`;

                    return [
                        `Estatus: ${oficio.estatus}`,
                        `Recepción: ${formattedRecepcion}`,
                        `Respuesta: ${formattedRespuesta}`
                    ];
                }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true // Comienza el eje y en 0
          }
        },
        onClick: (event, elements) => { // Agrega evento onClick
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const oficio = this.reporte.datos_oficios[index];
            window.open(`/ficha_tecnica/${oficio._id}`, '_blank');
          }
        }
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
    const area = this.selectedAreaReporteDiario;

    this._reportes.exportarExcelFormatogenerarReporte(fechaInicio, fechaFin, area)
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
