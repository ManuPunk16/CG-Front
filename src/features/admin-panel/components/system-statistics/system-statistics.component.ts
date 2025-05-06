import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Chart, registerables } from 'chart.js';
import { InputService } from '../../../../core/services/api/input.service';
import { PermissionsService } from '../../../../core/services/utility/permissions.service';
import { AlertService } from '../../../../core/services/ui/alert.service';
import { DatePipe } from '@angular/common';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AreasEnum, getAllAreas } from '../../../../core/models/enums/areas.enum';
import { Router } from '@angular/router';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-system-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  providers: [DatePipe],
  templateUrl: './system-statistics.component.html',
  styleUrls: ['./system-statistics.component.scss']
})
export class SystemStatisticsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() chartType: 'bar' | 'line' | 'pie' = 'bar';
  @Input() areaFilter: string = '';
  @Input() showFilters: boolean = true;
  @Input() height: string = 'auto';

  // Gráficos
  tiemposRespuestaChart: any;
  estatusChart: any;
  @ViewChild('tiemposRespuestaCanvas') tiemposRespuestaCanvas!: ElementRef;
  @ViewChild('estatusCanvas') estatusCanvas!: ElementRef;

  // Formularios
  filterForm: FormGroup;

  // Áreas permitidas usando el enum
  availableAreas: string[] = [];

  // Datos para gráficos
  tiemposRespuestaData: any = null;
  estatusData: any = null;

  // Estado de carga
  isLoading: boolean = false;

  // Para limpieza de suscripciones
  private destroy$ = new Subject<void>();

  // Exponer AreasEnum al template
  areasEnum = AreasEnum;

  // Agregar esta propiedad a la clase
  fechaActual = new Date();

  constructor(
    private fb: FormBuilder,
    private inputService: InputService,
    private permissionsService: PermissionsService,
    private alertService: AlertService,
    private datePipe: DatePipe,
    private router: Router,  // Añadir Router para navegación
    private cdr: ChangeDetectorRef // Importante: agregar esta referencia
  ) {
    // Inicializar formulario
    this.filterForm = this.fb.group({
      area: ['', Validators.required],
      fechaInicio: [''],
      fechaFin: ['']
    });
  }

  // Función de validación personalizada para el formulario
  private dateRangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const start = group.get('fechaInicio')?.value;
      const end = group.get('fechaFin')?.value;

      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (startDate > endDate) {
          return { 'dateRangeInvalid': true };
        }
      }

      return null;
    };
  }

  ngOnInit(): void {
    // Inicializar el formulario con validadores requeridos
    this.filterForm = this.fb.group({
      area: ['', [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]]
    }, {
      validators: this.dateRangeValidator()
    });

    // Observar cambios en las fechas para validar el rango
    this.filterForm.get('fechaInicio')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.filterForm.updateValueAndValidity());

    this.filterForm.get('fechaFin')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.filterForm.updateValueAndValidity());

    // Cargar las áreas permitidas según el rol del usuario
    this.loadAvailableAreas();

    // Si se proporciona un área de filtro como entrada, establecerla
    if (this.areaFilter) {
      this.filterForm.patchValue({ area: this.areaFilter });
      if (!this.showFilters) {
        this.loadStatistics(); // Cargar estadísticas automáticamente si no se muestran filtros
      }
    }
  }

  ngAfterViewInit(): void {
    // Si ya tenemos datos cargados, renderizar los gráficos
    if (this.tiemposRespuestaData && this.estatusData) {
      setTimeout(() => {
        this.renderTiemposRespuestaChart();
        this.renderEstatusChart();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Destruir gráficos para evitar memory leaks
    if (this.tiemposRespuestaChart) {
      this.tiemposRespuestaChart.destroy();
    }

    if (this.estatusChart) {
      this.estatusChart.destroy();
    }
  }

  loadAvailableAreas(): void {
    // Obtener áreas permitidas para el usuario actual
    const areas = this.permissionsService.getCurrentUserAllowedAreas();

    if (areas === null) {
      // Usuario con acceso a todas las áreas (admin)
      // Usar el enum para obtener todas las áreas
      this.availableAreas = getAllAreas();
    } else {
      // Usuario con acceso limitado
      this.availableAreas = areas;
    }

    // Si solo hay un área disponible, seleccionarla automáticamente
    if (this.availableAreas.length === 1) {
      this.filterForm.patchValue({ area: this.availableAreas[0] });
    }
  }

  loadStatistics(): void {
    // Verificar que el formulario sea válido
    if (this.filterForm.invalid) {
      console.warn('Formulario inválido, no se pueden cargar estadísticas');
      return;
    }

    this.isLoading = true;
    const { area, fechaInicio, fechaFin } = this.filterForm.value;

    // Log para debugging
    console.log('Realizando consulta con:', { area, fechaInicio, fechaFin });

    // Asegurarse de que las fechas están presentes
    if (!area || !fechaInicio || !fechaFin) {
      this.alertService.warning('Por favor, complete todos los campos para realizar la consulta.');
      this.isLoading = false;
      return;
    }

    // Ejecutar ambas consultas en paralelo
    forkJoin({
      tiemposRespuesta: this.inputService.getTiemposRespuestaArea(area, fechaInicio, fechaFin),
      estatus: this.inputService.getEstadisticasEstatusArea(area, fechaInicio, fechaFin)
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        this.tiemposRespuestaData = results.tiemposRespuesta.data;
        this.estatusData = results.estatus.data;

        // Calcular estadísticas adicionales si están disponibles
        if (this.tiemposRespuestaData) {
          this.calcularEstadisticas(this.tiemposRespuestaData);
        }

        this.isLoading = false;

        // Esperar a que Angular actualice la vista y luego renderizar los gráficos
        this.cdr.detectChanges();

        // Usar setTimeout para asegurarnos de que el DOM esté actualizado
        setTimeout(() => {
          console.log('Intentando renderizar gráficos después de timeout');
          console.log('Canvas disponibles:', {
            tiempos: !!this.tiemposRespuestaCanvas?.nativeElement,
            estatus: !!this.estatusCanvas?.nativeElement
          });

          // Intentar renderizar las gráficas
          this.renderTiemposRespuestaChart();
          this.renderEstatusChart();
        }, 200);
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
        this.alertService.error(`Error al cargar estadísticas: ${err.error?.message || 'Verifique los datos ingresados'}`);
        this.isLoading = false;
      }
    });
  }

  renderTiemposRespuestaChart(): void {
    if (!this.tiemposRespuestaData) {
      console.log('No hay datos de tiempos de respuesta para renderizar');
      return;
    }

    // Verificación adicional para asegurar que el canvas existe
    if (!this.tiemposRespuestaCanvas || !this.tiemposRespuestaCanvas.nativeElement) {
      console.log('Canvas para tiempos de respuesta no está disponible. Reintentando...');
      setTimeout(() => this.renderTiemposRespuestaChart(), 200);
      return;
    }

    // Destruir gráfico previo si existe
    if (this.tiemposRespuestaChart) {
      this.tiemposRespuestaChart.destroy();
    }

    try {
      console.log('Creando gráfico de tiempos de respuesta');

      // Preparar datos para el gráfico
      const { distribucion_por_categoria } = this.tiemposRespuestaData;

      const labels = ['Rápido', 'Normal', 'Lento', 'Muy Lento'];
      const data = [
        distribucion_por_categoria?.rapido || 0,
        distribucion_por_categoria?.normal || 0,
        distribucion_por_categoria?.lento || 0,
        distribucion_por_categoria?.muy_lento || 0
      ];

      // Colores según categoría (verde a rojo)
      const backgroundColors = [
        'rgba(75, 192, 75, 0.7)',  // Verde para rápido
        'rgba(75, 192, 192, 0.7)', // Azul para normal
        'rgba(255, 159, 64, 0.7)', // Naranja para lento
        'rgba(255, 99, 99, 0.7)'   // Rojo para muy lento
      ];

      // Crear el gráfico
      this.tiemposRespuestaChart = new Chart(this.tiemposRespuestaCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Oficios por tiempo de respuesta',
            data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Distribución por Tiempo de Respuesta',
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.parsed.y} oficios`
              }
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

      console.log('Gráfico de tiempos de respuesta creado exitosamente');
    } catch (error) {
      console.error('Error al crear gráfico de tiempos:', error);
    }
  }

  renderEstatusChart(): void {
    if (!this.estatusData) {
      console.log('No hay datos de estatus para renderizar');
      return;
    }

    // Verificación adicional para asegurar que el canvas existe
    if (!this.estatusCanvas || !this.estatusCanvas.nativeElement) {
      console.log('Canvas para estatus no está disponible. Reintentando...');
      setTimeout(() => this.renderEstatusChart(), 200);
      return;
    }

    // Destruir gráfico previo si existe
    if (this.estatusChart) {
      this.estatusChart.destroy();
    }

    try {
      console.log('Creando gráfico de estatus');

      // Extraer datos del API
      const { distribucionEstatus } = this.estatusData;

      // Asegurar que hay datos
      const labels = distribucionEstatus?.labels || [];
      const data = distribucionEstatus?.data || [];

      // Preparar colores para cada estatus
      const backgroundColors = labels.map((label: string) =>
        label === 'ATENDIDO' ? 'rgba(75, 192, 75, 0.7)' : 'rgba(255, 99, 99, 0.7)'
      );

      // Crear el gráfico
      this.estatusChart = new Chart(this.estatusCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Oficios por estatus',
            data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Distribución por Estatus',
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const porcentaje = distribucionEstatus?.porcentajes?.[context.dataIndex] || 0;
                  return [`${context.parsed.y} oficios`, `${porcentaje}% del total`];
                }
              }
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

      console.log('Gráfico de estatus creado exitosamente');
    } catch (error) {
      console.error('Error al crear gráfico de estatus:', error);
    }
  }

  applyFilters(): void {
    if (this.filterForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.filterForm.controls).forEach(key => {
        const control = this.filterForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    // Destruir gráficos existentes
    if (this.tiemposRespuestaChart) {
      this.tiemposRespuestaChart.destroy();
      this.tiemposRespuestaChart = null;
    }

    if (this.estatusChart) {
      this.estatusChart.destroy();
      this.estatusChart = null;
    }

    // Cargar estadísticas con un pequeño delay
    setTimeout(() => {
      this.loadStatistics();
    }, 50);
  }

  resetFilters(): void {
    // Conservar área si no es admin o si se proporcionó como filtro externo
    const currentArea = this.filterForm.get('area')?.value;

    this.filterForm.reset({
      area: this.areaFilter || currentArea || '',
      fechaInicio: '',
      fechaFin: ''
    });

    // No cargar estadísticas automáticamente después de reiniciar
    // el usuario debe hacer clic en Aplicar
  }

  // Obtener estadísticas adicionales para mostrar
  get totalOficios(): number {
    return this.tiemposRespuestaData?.estadisticas?.total_oficios || 0;
  }

  get oficiosAtendidos(): number {
    return this.tiemposRespuestaData?.estadisticas?.total_atendidos || 0;
  }

  get oficiosNoAtendidos(): number {
    return this.tiemposRespuestaData?.estadisticas?.total_no_atendidos || 0;
  }

  get promedioDias(): number {
    return this.tiemposRespuestaData?.estadisticas?.promedio_dias || 0;
  }

  get porcentajeAtencion(): number {
    const total = this.totalOficios;
    if (total === 0) return 0;
    return Math.round((this.oficiosAtendidos / total) * 100);
  }

  // Helpers para dar colores a las tarjetas de estadísticas
  getColorForPorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'bg-green-50 border-green-200';
    if (porcentaje >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  }

  getTextColorForPorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'text-green-700';
    if (porcentaje >= 50) return 'text-yellow-700';
    return 'text-red-700';
  }

  /**
   * Calcula estadísticas adicionales a partir de los datos de tiempos de respuesta
   * Este método procesa los datos recibidos para extraer métricas relevantes
   */
  calcularEstadisticas(data: any): void {
    // Verificar que los datos existan
    if (!data) return;

    // Si ya vienen calculadas las estadísticas del backend, no hacer nada adicional
    if (data.estadisticas) return;

    // Si no hay datos calculados del backend, crear objeto de estadísticas
    data.estadisticas = {
      total_oficios: 0,
      total_atendidos: 0,
      total_no_atendidos: 0,
      promedio_dias: 0,
      mediana_dias: 0
    };

    // Verificar si tenemos un array de oficios para calcular estadísticas
    if (Array.isArray(data.oficios) && data.oficios.length > 0) {
      const oficios = data.oficios;

      // Conteo básico
      data.estadisticas.total_oficios = oficios.length;

      // Contar por estatus
      data.estadisticas.total_atendidos = oficios.filter(
        (oficio: any) => oficio.estatus === 'ATENDIDO'
      ).length;

      data.estadisticas.total_no_atendidos = oficios.filter(
        (oficio: any) => oficio.estatus === 'NO ATENDIDO'
      ).length;

      // Calcular promedio de días solo para oficios atendidos que tienen diferencia_dias
      const oficiosConDiferencia = oficios.filter(
        (oficio: any) => oficio.estatus === 'ATENDIDO' && typeof oficio.diferencia_dias === 'number'
      );

      if (oficiosConDiferencia.length > 0) {
        const sumaDias = oficiosConDiferencia.reduce(
          (sum: number, oficio: any) => sum + oficio.diferencia_dias,
          0
        );

        data.estadisticas.promedio_dias = parseFloat(
          (sumaDias / oficiosConDiferencia.length).toFixed(2)
        );

        // Cálculo de la mediana (primero ordenamos los valores)
        const diasOrdenados = oficiosConDiferencia
          .map((oficio: any) => oficio.diferencia_dias)
          .sort((a: number, b: number) => a - b);

        const mitad = Math.floor(diasOrdenados.length / 2);

        if (diasOrdenados.length % 2 === 0) {
          // Si hay un número par de elementos, la mediana es el promedio de los dos del medio
          data.estadisticas.mediana_dias = parseFloat(
            ((diasOrdenados[mitad - 1] + diasOrdenados[mitad]) / 2).toFixed(2)
          );
        } else {
          // Si hay un número impar, la mediana es el elemento del medio
          data.estadisticas.mediana_dias = parseFloat(
            diasOrdenados[mitad].toFixed(2)
          );
        }
      }
    }

    // Cálculo de distribución por categoría de tiempo si no existe
    if (!data.distribucion_por_categoria) {
      data.distribucion_por_categoria = {
        rapido: 0,     // 0-3 días
        normal: 0,     // 4-10 días
        lento: 0,      // 11-30 días
        muy_lento: 0   // 31+ días
      };

      // Si tenemos oficios, calcular la distribución
      if (Array.isArray(data.oficios) && data.oficios.length > 0) {
        data.oficios.forEach((oficio: any) => {
          if (oficio.estatus !== 'ATENDIDO' || typeof oficio.diferencia_dias !== 'number') {
            return; // Skip non-attended or without difference
          }

          const dias = oficio.diferencia_dias;

          if (dias <= 3) {
            data.distribucion_por_categoria.rapido++;
          } else if (dias <= 10) {
            data.distribucion_por_categoria.normal++;
          } else if (dias <= 30) {
            data.distribucion_por_categoria.lento++;
          } else {
            data.distribucion_por_categoria.muy_lento++;
          }
        });
      }
    }
  }

  /**
   * Navega a la ficha técnica del documento
   * @param id ID del documento
   */
  verFichaTecnica(id: string): void {
    // Esta función podría usarse como alternativa al enlace directo en el HTML
    this.router.navigate(['/Entradas/Ficha-tecnica', id]);
  }

  // Ajustar el método que procesa los datos para garantizar que tenemos el _id en cada oficio
  private procesarDatosOficios(data: any[]): any[] {
    return data.map(oficio => {
      // Asegurar que tenemos acceso al ID para navegación
      if (!oficio._id && oficio.id) {
        oficio._id = oficio.id; // Asignar ID si está en formato diferente
      }

      // Resto del procesamiento
      return oficio;
    });
  }

  // Agregar este método a la clase
  /**
   * Comprueba si dos fechas son el mismo día
   * @param date1 Primera fecha a comparar
   * @param date2 Segunda fecha a comparar (opcional, por defecto es la fecha actual)
   * @returns true si son el mismo día, false en caso contrario
   */
  isSameDay(date1: any, date2: Date = this.fechaActual): boolean {
    if (!date1) return false;

    const d1 = new Date(date1);
    const d2 = date2;

    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }
}
