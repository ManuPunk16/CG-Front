import { ChangeDetectorRef, Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, finalize } from 'rxjs';

import { LogService } from '../../../core/services/api/log.service';
import { LoginLog } from '../../../core/models/login-log.model';
import { AlertService } from '../../../core/services/ui/alert.service';
import { LogStats } from '../../../core/models/log-stats.model';
import { Chart, registerables } from 'chart.js';

// Registrar componentes Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-login-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './login-logs.component.html',
  styleUrls: ['./login-logs.component.scss']
})
export class LoginLogsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() userPermissions: any;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Referencias a elementos canvas con ViewChild
  @ViewChild('dailyChartCanvas') dailyChartCanvas!: ElementRef;
  @ViewChild('userChartCanvas') userChartCanvas!: ElementRef;
  @ViewChild('areaChartCanvas') areaChartCanvas!: ElementRef;

  // Variables para tabla de logs
  displayedColumns: string[] = ['userName', 'area', 'timestamp', 'ipAddress', 'details'];
  dataSource = new MatTableDataSource<LoginLog>();
  isLoading = false;
  totalLogs = 0;
  currentPage = 0;
  pageSize = 10;

  // Variables para filtrado
  filterForm: FormGroup;
  areas: string[] = [];

  // Variables para gráficos
  stats: LogStats | null = null;
  dailyChart: any;
  userChart: any;
  areaChart: any;
  showCharts = true;

  private destroy$ = new Subject<void>();
  // Variable para controlar si los gráficos ya fueron inicializados
  private chartsInitialized = false;

  constructor(
    private logService: LogService,
    private alertService: AlertService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      username: [''],
      fromDate: [null],
      toDate: [null],
      area: ['todas'],
      days: [30]
    });
  }

  ngOnInit(): void {
    // Configuración basada en permisos
    this.setupComponent();

    // Cargar áreas permitidas
    if (this.userPermissions) {
      if (this.userPermissions.isAdmin) {
        this.areas = ['todas', 'DIRECCIÓN ADMINISTRATIVA', 'DIRECCIÓN DE ASISTENCIA TÉCNICA Y COMBATE A LA CORRUPCIÓN', 'CONSEJERO JURÍDICO'];
      } else if (this.userPermissions.isDirectorGeneral) {
        this.areas = ['todas', ...this.userPermissions.areas || []];
      }
    }

    // Cargar datos iniciales
    this.loadLoginLogs();

    // Si tiene permisos, cargar estadísticas
    if (this.canViewStats()) {
      // Establecer un pequeño retraso para asegurar que los elementos estén en el DOM
      setTimeout(() => {
        this.loadLoginStats();
      }, 100);
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Si ya tenemos datos de estadísticas, intentar renderizar los gráficos después de que la vista haya sido inicializada
    if (this.stats && !this.chartsInitialized) {
      setTimeout(() => {
        this.renderCharts();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Destruir charts para evitar memory leaks
    if (this.dailyChart) this.dailyChart.destroy();
    if (this.userChart) this.userChart.destroy();
    if (this.areaChart) this.areaChart.destroy();
  }

  setupComponent(): void {
    // Configurar la visualización según permisos
    if (this.userPermissions?.isAdmin || this.userPermissions?.isDirectorGeneral) {
      this.displayedColumns = ['userName', 'username', 'area', 'timestamp', 'ipAddress', 'userAgent'];
    } else {
      this.displayedColumns = ['timestamp', 'ipAddress', 'userAgent'];
      this.showCharts = false;
    }
  }

  loadLoginLogs(): void {
    this.isLoading = true;

    // Verificar si realmente tiene los permisos necesarios
    if (!this.userPermissions) {
      // Si no hay permisos definidos, cargar solo los logs del usuario
      this.loadUserLogs();
      return;
    }

    const filters = this.prepareFilters();

    if (this.userPermissions?.isAdmin || this.userPermissions?.isDirectorGeneral) {
      this.logService.getAllLoginLogs({
        ...filters,
        page: this.currentPage + 1,
        limit: this.pageSize
      }).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (response) => {
          if (response && response.data) {
            this.dataSource.data = response.data;
            this.totalLogs = response.metadata?.total || 0;
          }
        },
        error: (error) => {
          console.error('Error al cargar logs de acceso:', error);
          if (error.status === 403) {
            // Si hay error de permisos, intentar cargar solo los logs del usuario
            this.alertService.warning('No tienes permisos para ver todos los logs. Mostrando solo tus registros.');
            this.loadUserLogs();
          } else {
            this.alertService.error('Error al cargar los registros de acceso');
            this.isLoading = false;
          }
        }
      });
    } else {
      this.loadUserLogs();
    }
  }

  // Método auxiliar para cargar logs del usuario actual
  private loadUserLogs(): void {
    this.logService.getUserLoginLogs().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.dataSource.data = response.data;
          this.totalLogs = response.data.length; // Para usuarios normales, usamos la longitud del array
        }
      },
      error: (error) => {
        console.error('Error al cargar logs de acceso del usuario:', error);
        this.alertService.error('Error al cargar los registros de acceso');
      }
    });
  }

  loadLoginStats(): void {
    const { days, area } = this.filterForm.value;

    this.logService.getLoginStats({ days, area }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.stats = response.data;

          // Solo intentamos renderizar los gráficos si la vista ya ha sido inicializada
          if (this.dailyChartCanvas && this.userChartCanvas && this.areaChartCanvas) {
            this.renderCharts();
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.alertService.error('Error al cargar las estadísticas de acceso');
      }
    });
  }

  renderCharts(): void {
    if (!this.stats) {
      console.log('No hay estadísticas para renderizar');
      return;
    }

    // Verificar que los elementos canvas existan
    if (!this.dailyChartCanvas || !this.userChartCanvas || !this.areaChartCanvas) {
      console.log('Referencias a canvas no disponibles', {
        daily: !!this.dailyChartCanvas,
        user: !!this.userChartCanvas,
        area: !!this.areaChartCanvas
      });
      return;
    }

    // Destruir gráficos anteriores si existen
    if (this.dailyChart) this.dailyChart.destroy();
    if (this.userChart) this.userChart.destroy();
    if (this.areaChart) this.areaChart.destroy();

    try {
      // Crear gráfico de accesos diarios
      this.dailyChart = new Chart(this.dailyChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.stats.daily.labels,
          datasets: [{
            label: 'Inicios de sesión',
            data: this.stats.daily.data,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
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
              text: 'Accesos por día'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });

      // Crear gráfico de top usuarios
      this.userChart = new Chart(this.userChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.stats.users.labels,
          datasets: [{
            label: 'Inicios de sesión',
            data: this.stats.users.data,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Top 10 Usuarios'
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });

      // Crear gráfico de accesos por área
      this.areaChart = new Chart(this.areaChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.stats.areas.labels,
          datasets: [{
            label: 'Inicios de sesión',
            data: this.stats.areas.data,
            backgroundColor: 'rgba(153, 102, 255, 0.7)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Accesos por Área'
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });

      // Marcar gráficos como inicializados
      this.chartsInitialized = true;

      // Forzar detección de cambios para actualizar la vista
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al renderizar los gráficos:', error);
    }
  }

  prepareFilters(): any {
    const { username, fromDate, toDate, area } = this.filterForm.value;

    const filters: any = {};

    if (username) filters.username = username;

    if (fromDate) {
      filters.fromDate = fromDate.toISOString().split('T')[0];
    }

    if (toDate) {
      filters.toDate = toDate.toISOString().split('T')[0];
    }

    if (area && area !== 'todas') {
      filters.area = area;
    }

    return filters;
  }

  applyFilter(): void {
    this.currentPage = 0;
    this.loadLoginLogs();

    if (this.canViewStats()) {
      this.loadLoginStats();
    }
  }

  resetFilter(): void {
    this.filterForm.reset({
      username: '',
      fromDate: null,
      toDate: null,
      area: 'todas',
      days: 30
    });

    this.currentPage = 0;
    this.loadLoginLogs();

    if (this.canViewStats()) {
      this.loadLoginStats();
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLoginLogs();
  }

  canViewStats(): boolean {
    return this.userPermissions?.isAdmin || this.userPermissions?.isDirectorGeneral;
  }

  exportToExcel(): void {
    // Esta función se implementaría si se necesita exportar logs
    this.alertService.info('Función de exportación en desarrollo');
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  formatUserAgent(userAgent: string): string {
    if (!userAgent) return 'Desconocido';

    // Simplificar el user agent para mostrar solo información relevante
    if (userAgent.includes('Chrome')) {
      return 'Chrome ' + userAgent.split('Chrome/')[1].split(' ')[0];
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox ' + userAgent.split('Firefox/')[1].split(' ')[0];
    } else if (userAgent.includes('Safari')) {
      return 'Safari ' + userAgent.split('Safari/')[1].split(' ')[0];
    } else if (userAgent.includes('Edge')) {
      return 'Edge ' + userAgent.split('Edge/')[1].split(' ')[0];
    } else {
      return userAgent.substring(0, 50) + '...';
    }
  }
}
