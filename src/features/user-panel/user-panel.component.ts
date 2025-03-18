import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { ReportesService } from '../../core/services/reportes.service';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { AreaService } from '../../core/services/areas.service';
import { Area } from '../../core/models/area.model';
import { Input } from '../../core/models/input.model';
import {
  Chart,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { RouterLink } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
import { DateFormatService } from '../../core/services/date-format.service';
import { StateService } from '../../core/services/state.service';

Chart.register(
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip
);

interface ResumenTiempos {
  promedio_dias: number | null;
  mediana_dias: number | null;
  percentil25_dias: number | null;
  percentil75_dias: number | null;
  desviacion_estandar_dias: number | null;
  total_atendidos: number | null;
  total_no_atendidos: number | null;
  total_oficios: number;
  datos_oficios: Input[];
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
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
  ],
  templateUrl: './user-panel.component.html',
  styleUrl: './user-panel.component.scss',
})
export class UserPanelComponent implements OnInit {
  reportesDiarios: any[] = [];
  fechaBusquedaDiaria: string = '';

  reporteTiempoRespuesta: ResumenTiempos = {
    promedio_dias: null,
    mediana_dias: null,
    percentil25_dias: null,
    percentil75_dias: null,
    desviacion_estandar_dias: null,
    total_atendidos: null,
    total_no_atendidos: null,
    total_oficios: 0,
    datos_oficios: [],
  };

  reporteEstatus: { estatus: string; count: number }[] = [];
  areaConsultada: string = '';
  graficaTiempoRespuestaActivada: boolean = false;

  areas: Area[] = [];
  selectedArea: string = '';
  selectedAreaTiempoRespuesta: string = '';
  selectedAreaEstatus: string = '';
  selectedAreaReporteDiario: string = '';

  fechaInicioTiempoRespuesta: string = '';
  fechaFinTiempoRespuesta: string = '';
  fechaInicioEstatus: string = '';
  fechaFinEstatus: string = '';
  fechaInicioReporteDiario: string = '';
  fechaFinReporteDiario: string = '';

  busquedaExitosa: boolean = false;

  estatusFiltro: string = 'ATENDIDO';

  @ViewChild('chartTiempoRespuesta') chartTiempoRespuestaElement!: ElementRef;
  chartTiempoRespuesta!: Chart;

  @ViewChild('chartEstatus') chartEstatusElement!: ElementRef;
  chartEstatus!: Chart;

  constructor(
    public tokenStorage: TokenStorageService,
    private reportesService: ReportesService,
    private areaService: AreaService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private dateFormatService: DateFormatService,
    public stateService: StateService
  ) {}

  ngOnInit(): void {
    this.loadAreas();
  }

  ngAfterViewInit(): void {
    if (this.reporteEstatus && this.reporteEstatus.length > 0) {
      this.createEstatusChart();
    }
  }

  loadAreas(): void {
    this.areaService.getAllAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al obtener las áreas:', error);
        this.alertService.showError(
          'Error al cargar las áreas',
          'Por favor, inténtalo de nuevo más tarde.'
        );
      },
    });
  }

  loadReporteTiempoRespuestaModerador(): void {
    if (!this.fechaInicioTiempoRespuesta || !this.selectedAreaTiempoRespuesta) {
      console.error('Fecha de inicio y área son requeridas.');
      return;
    }

    this.areaConsultada = this.selectedAreaTiempoRespuesta;

    this.reportesService
      .calcularTiempoRespuestaTotal(
        this.selectedAreaTiempoRespuesta,
        this.fechaInicioTiempoRespuesta,
        this.fechaFinTiempoRespuesta
      )
      .subscribe({
        next: (data: ResumenTiempos) => {
          this.reporteTiempoRespuesta = data;
          this.createTiempoRespuestaChart();
          this.graficaTiempoRespuestaActivada = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al generar el reporte de tiempo de respuesta.'
          );
        },
      });
  }

  loadReporteTiempoRespuestaEnlace(): void {
    if (!this.fechaInicioTiempoRespuesta) {
      console.error('Fecha de inicio es requerida.');
      return;
    }

    const user = this.tokenStorage.getUser();
    this.areaConsultada = user.area;

    this.reportesService
      .calcularTiempoRespuestaTotal(
        user.area,
        this.fechaInicioTiempoRespuesta,
        this.fechaFinTiempoRespuesta
      )
      .subscribe({
        next: (data: ResumenTiempos) => {
          this.reporteTiempoRespuesta = data;
          this.createTiempoRespuestaChart();
          this.graficaTiempoRespuestaActivada = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al generar el reporte de tiempo de respuesta.'
          );
        },
      });
  }

  loadReporteEstatusModerador(): void {
    if (!this.fechaInicioEstatus || !this.selectedAreaEstatus) {
      console.error('Fecha de inicio y área son requeridas.');
      return;
    }

    this.areaConsultada = this.selectedAreaEstatus;

    this.reportesService
      .obtenerEstadisticas(
        this.fechaInicioEstatus,
        this.fechaFinEstatus,
        this.selectedAreaEstatus
      )
      .subscribe({
        next: (res) => {
          this.reporteEstatus = res.estadisticas;
          this.cdr.detectChanges();
          this.createEstatusChart();
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al obtener estadísticas de estatus.'
          );
        },
      });
  }

  loadReporteEstatusEnlace(): void {
    if (!this.fechaInicioEstatus) {
      console.error('Fecha de inicio es requerida.');
      return;
    }

    const user = this.tokenStorage.getUser();
    this.areaConsultada = user.area;

    this.reportesService
      .obtenerEstadisticas(
        this.fechaInicioEstatus,
        this.fechaFinEstatus,
        user.area
      )
      .subscribe({
        next: (res) => {
          this.reporteEstatus = res.estadisticas;
          this.cdr.detectChanges();
          this.createEstatusChart();
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al obtener estadísticas de estatus.'
          );
        },
      });
  }

  debeHabilitarBuscar(): boolean {
    return !!this.fechaInicioEstatus && !!this.fechaFinEstatus;
  }

  debeHabilitarBuscarModerador(): boolean {
    return (
      !!this.fechaInicioEstatus &&
      !!this.fechaFinEstatus &&
      !!this.selectedAreaEstatus
    );
  }

  debeHabilitarBuscarTiempoRespuesta(): boolean {
    return !!this.fechaInicioTiempoRespuesta && !!this.fechaFinTiempoRespuesta;
  }

  debeHabilitarBuscarTiempoRespuestaModerador(): boolean {
      return !!this.fechaInicioTiempoRespuesta && !!this.fechaFinTiempoRespuesta && !!this.selectedAreaTiempoRespuesta;
  }

  loadReporteDiario(): void {
    this.reportesService.getAreasPerDay(this.fechaBusquedaDiaria).subscribe({
      next: (data) => {
        this.reportesDiarios = data;
        this.stateService.setIsTrue(false);
        this.busquedaExitosa = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.handleReportError(error, 'Error al cargar el reporte diario.');
        this.busquedaExitosa = false;
      },
    });
  }

  downloadReporteDiario(): void {
    if (this.fechaBusquedaDiaria) {
      this.reportesService
        .getReporteResumen(this.fechaBusquedaDiaria)
        .subscribe({
          next: (blob) => {
            this.downloadFile(
              blob,
              `reporte_resumen_${this.dateFormatService.formatDate(
                new Date()
              )}.xlsx`
            );
          },
          error: (error) => {
            this.handleReportError(
              error,
              'Error al descargar el reporte diario.'
            );
          },
        });
    }
  }

  downloadReporteGeneral(): void {
    this.reportesService
      .exportarExcelFormatogenerarReporte(
        this.fechaInicioReporteDiario,
        this.fechaFinReporteDiario,
        this.selectedAreaReporteDiario
      )
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'reporte.xlsx');
        },
        error: (error) => {
          this.handleReportError(error, 'Error al generar el reporte general.');
        },
      });
  }

  downloadReporteEstatusModerador(): void {
    const area = this.selectedArea; // Usa el área seleccionada en el select

    this.reportesService
      .exportarDatosExcelPorEstatusFechaPorArea(
        this.estatusFiltro,
        area,
        this.fechaInicioEstatus,
        this.fechaFinEstatus
      )
      .subscribe({
        next: (blob) => {
          this.downloadFile(
            blob,
            `Reporte_por_${
              this.estatusFiltro
            }_${this.dateFormatService.formatDate(new Date())}.xlsx`
          );
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al generar el reporte de estatus.'
          );
        },
      });
  }

  downloadReporteEstatusEnlace(): void {
    const area = this.tokenStorage.getUser().area; // Usa el área del perfil del usuario

    this.reportesService
      .exportarDatosExcelPorEstatusFechaPorArea(
        this.estatusFiltro,
        area,
        this.fechaInicioEstatus,
        this.fechaFinEstatus
      )
      .subscribe({
        next: (blob) => {
          this.downloadFile(
            blob,
            `Reporte_por_${
              this.estatusFiltro
            }_${this.dateFormatService.formatDate(new Date())}.xlsx`
          );
        },
        error: (error) => {
          this.handleReportError(
            error,
            'Error al generar el reporte de estatus.'
          );
        },
      });
  }

  createTiempoRespuestaChart(): void {
    if (this.chartTiempoRespuesta) {
      this.chartTiempoRespuesta.destroy();
    }

    const canvas =
      this.chartTiempoRespuestaElement.nativeElement.getContext('2d');
    this.chartTiempoRespuesta = new Chart(canvas, {
      type: 'bar',
      data: {
        labels:
          this.reporteTiempoRespuesta?.datos_oficios?.map(
            (oficio) => oficio.num_oficio
          ) ?? [],
        datasets: [
          {
            label: 'Diferencia en días',
            data:
              this.reporteTiempoRespuesta?.datos_oficios?.map(
                (oficio) => oficio.diferencia_dias
              ) ?? [],
            backgroundColor:
              this.reporteTiempoRespuesta?.datos_oficios?.map((oficio) =>
                oficio.estatus === 'ATENDIDO'
                  ? 'rgb(82, 255, 82)'
                  : 'rgb(255, 41, 41)'
              ) ?? [],
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: 'Diferencia de días entre la Fecha de Recepción y la Fecha de Acuse de Recibido',
          },
          tooltip: {
            callbacks: { label: (context) => this.formatTooltipLabel(context) },
          },
        },
        scales: { y: { beginAtZero: true } },
        onClick: (event, elements) => this.handleChartClick(elements),
      },
    });
  }

  createEstatusChart(): void {
    if (this.chartEstatus) {
      this.chartEstatus.destroy();
    }

    const estadisticasOrdenadas = [...this.reporteEstatus].sort((a, b) => {
      if (a.estatus === 'ATENDIDO') return -1;
      if (b.estatus === 'ATENDIDO') return 1;
      return 0;
    });

    const canvas = this.chartEstatusElement.nativeElement.getContext('2d');
    this.chartEstatus = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: estadisticasOrdenadas.map((est) => est.estatus),
        datasets: [
          {
            label: 'Cantidad por Estatus',
            data: this.reporteEstatus.map((est) => est.count),
            backgroundColor: estadisticasOrdenadas.map((est) =>
              this.getStatusColor(est.estatus)
            ),
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: `Estadísticas de Estatus para ${this.areaConsultada} (${this.fechaInicioEstatus} - ${this.fechaFinEstatus})`,
          },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private formatTooltipLabel(context: any): string[] {
    const index = context.dataIndex;
    const oficio = this.reporteTiempoRespuesta.datos_oficios[index];
    const tiempoRecepcion = new Date(oficio.tiempo_recepcion);
    const tiempoRespuesta = new Date(oficio.tiempo_respuesta);

    return [
      `Estatus: ${oficio.estatus}`,
      `Recepción: ${this.dateFormatService.formatDate(tiempoRecepcion)}`,
      `Respuesta: ${this.dateFormatService.formatDate(tiempoRespuesta)}`,
    ];
  }

  private handleChartClick(elements: any[]): void {
    if (elements && elements.length > 0) {
      const index = elements[0].index;
      const oficio = this.reporteTiempoRespuesta.datos_oficios[index];
      window.open(`/ficha_tecnica/${oficio._id}`, '_blank');
    }
  }

  private getStatusColor(status: string): string {
    if (status === 'ATENDIDO') return 'rgb(82, 255, 82)';
    if (status === 'NO ATENDIDO') return 'rgb(255, 41, 41)';
    return 'rgba(54, 162, 235, 0.5)';
  }

  private downloadFile(blob: Blob, filename: string): void {
    const downloadURL = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(downloadURL);
  }

  private handleReportError(error: any, defaultMessage: string): void {
    console.error('Error en la solicitud:', error);

    if (error.status === 404) {
      this.alertService.showInfo(
        'Sin resultados',
        'No se encontraron registros para los parámetros seleccionados.'
      );
    } else if (error.error instanceof Blob) {
      this.parseBlobError(error.error);
    } else if (error.error && typeof error.error === 'string') {
      this.alertService.showError('Oops...', error.error);
    } else {
      this.alertService.showError('Oops...', defaultMessage);
    }
  }

  private parseBlobError(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const errorData = JSON.parse(event.target.result);
        console.error('Error del backend:', errorData);
        let errorMessage = errorData.error;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.join('\n');
        }
        if (errorMessage) {
          this.alertService.showError('Error', errorMessage);
        } else {
          this.alertService.showError(
            'Oops...',
            'Error al generar el reporte. Inténtalo de nuevo más tarde.'
          );
        }
      } catch (jsonError) {
        console.error('Error al parsear JSON:', jsonError);
        this.alertService.showError(
          'Oops...',
          'Error al generar el reporte. Inténtalo de nuevo más tarde.'
        );
      }
    };
    reader.readAsText(blob);
  }
}
