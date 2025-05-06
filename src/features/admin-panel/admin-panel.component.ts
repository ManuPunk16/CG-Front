import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';

// Componentes
import { SystemStatisticsComponent } from './components/system-statistics/system-statistics.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { LoginLogsComponent } from '../shared/login-logs/login-logs.component';

// Servicios
import { AuthService } from '../../core/services/api/auth.service';
import { PermissionsService } from '../../core/services/utility/permissions.service';
import { InputService } from '../../core/services/api/input.service';
import { AlertService } from '../../core/services/ui/alert.service';

// Interfaces y enums
import { RolesEnum } from '../../core/models/enums/roles.enum';
import { AreasEnum } from '../../core/models/enums/areas.enum';

// Interfaces para estadísticas de usuario
interface UsuarioEstadisticas {
  usuario: {
    username: string;
    area: string;
    roles: string;
    active: boolean;
  };
  estadisticas: {
    total_seguimientos: number;
    ultima_modificacion: UltimaModificacion | null;
  };
}

interface UltimaModificacion {
  anio: number;
  folio: number;
  num_oficio: string;
  estatus: string;
  fecha_respuesta: string;
  fecha_acuse_recibido: string;
  atencion_otorgada: string;
  ultimo_seguimiento: {
    createdAt: string;
    updatedAt: string;
  };
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    SystemStatisticsComponent,
    UserManagementComponent,
    LoginLogsComponent
  ],
  providers: [DatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  isAdmin = false;
  isDirectorGeneral = false;
  userRole = '';
  userArea = '';
  activeTab = 0;

  // Variables para filtros y datos
  allowedAreas: string[] = [];
  selectedArea: string = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  // Contadores para el panel
  totalRegistros = 0;
  registrosAtendidos = 0;
  registrosPendientes = 0;
  registrosSinAtender = 0;
  porcentajeAtendidos = 0;
  porcentajePendientes = 0;
  porcentajeSinAtender = 0;
  totalRespuestasRegistradas = 0;
  porcentajeRespuestasRegistradas = 0;
  porcentajeEnProceso = 0;

  // Variables para datos de usuarios y actividad
  usuariosActividad: UsuarioEstadisticas[] = [];
  usuariosActividadFiltrados: UsuarioEstadisticas[] = [];
  cargandoActividad = false;
  totalUsuarios = 0;

  // Para la tabla de actividad de usuarios
  columnasUsuarios: string[] = ['username', 'area', 'roles', 'total_seguimientos', 'ultima_actividad', 'detalles'];
  filtroUsuario: string = '';

  private destroy$ = new Subject<void>();

  // Estructura para almacenar estadísticas por área
  areaStats: Map<string, {total: number, atendidos: number, sinAtender: number, respuestasRegistradas: number}> = new Map();

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private inputService: InputService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadStatisticsData();
    this.loadUserActivityData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      this.userRole = currentUser.roles;
      this.userArea = currentUser.area;

      // Verificar roles específicos
      this.isAdmin = this.userRole.toLowerCase() === RolesEnum.ADMIN.toLowerCase();
      this.isDirectorGeneral = this.userRole.toLowerCase() === RolesEnum.DIRECTOR_GENERAL.toLowerCase();

      // Obtener áreas permitidas según rol y área del usuario
      const areas = this.permissionsService.getAreasByRole(this.userRole, this.userArea);
      this.allowedAreas = areas === null ? Object.values(AreasEnum) : areas;

      // Establecer el área seleccionada por defecto
      this.selectedArea = this.isAdmin ? 'todas' : this.allowedAreas[0] || '';
    }
  }

  // Carga los datos de estadísticas con detalle por área
  loadStatisticsData(): void {
    this.inputService.getEstadisticasRegistros()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            // Limpiar estadísticas anteriores
            this.areaStats.clear();

            // Inicializar contadores globales
            let totalAtendidos = 0;
            let totalNoAtendidos = 0;
            let totalDocumentos = 0;
            let totalRespuestasRegistradas = 0;

            // Procesar los datos por dirección (área)
            response.data.forEach((direccion: any) => {
              const areaNombre = direccion.direccion;
              let areaAtendidos = 0;
              let areaNoAtendidos = 0;
              let areaRespuestasRegistradas = 0;

              // Sumar por año y mes para esta área
              if (direccion.anios && Array.isArray(direccion.anios)) {
                direccion.anios.forEach((anio: any) => {
                  if (anio.meses && Array.isArray(anio.meses)) {
                    anio.meses.forEach((mes: any) => {
                      areaAtendidos += mes.atendido || 0;
                      areaNoAtendidos += mes.noAtendido || 0;
                      areaRespuestasRegistradas += mes.respuestaRegistrada || 0;
                    });
                  }
                });
              }

              // Guardar estadísticas de esta área
              const areaTotal = areaAtendidos + areaNoAtendidos;
              this.areaStats.set(areaNombre, {
                total: areaTotal,
                atendidos: areaAtendidos,
                sinAtender: areaNoAtendidos,
                respuestasRegistradas: areaRespuestasRegistradas
              });

              // Acumular totales globales
              totalAtendidos += areaAtendidos;
              totalNoAtendidos += areaNoAtendidos;
              totalDocumentos += areaTotal;
              totalRespuestasRegistradas += areaRespuestasRegistradas;
            });

            // Actualizar contadores globales
            this.totalRegistros = totalDocumentos;
            this.registrosAtendidos = totalAtendidos;
            this.registrosSinAtender = totalNoAtendidos;
            this.totalRespuestasRegistradas = totalRespuestasRegistradas;

            // Calcular porcentajes globales
            if (this.totalRegistros > 0) {
              this.porcentajeAtendidos = Math.round((totalAtendidos / this.totalRegistros) * 100);
              this.porcentajeSinAtender = Math.round((totalNoAtendidos / this.totalRegistros) * 100);
              this.porcentajeRespuestasRegistradas = Math.round((totalRespuestasRegistradas / this.totalRegistros) * 100);
              this.porcentajeEnProceso = Math.round(((totalAtendidos - totalRespuestasRegistradas) / this.totalRegistros) * 100);
            }

            // Ordenar las áreas por número de registros (de mayor a menor)
            this.allowedAreas = [...this.areaStats.keys()].sort((a, b) => {
              const statsA = this.areaStats.get(a);
              const statsB = this.areaStats.get(b);
              return (statsB?.total || 0) - (statsA?.total || 0);
            });

            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
          this.alertService.error('Error al cargar las estadísticas generales');
        }
      });
  }

  loadUserActivityData(): void {
    this.cargandoActividad = true;

    this.inputService.obtenerUltimasModificaciones()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargandoActividad = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Respuesta de actividad de usuarios:', response);
          if (response && response.data) {
            // Transformar los datos para que coincidan con la interfaz UsuarioEstadisticas
            this.usuariosActividad = response.data.map((item: any) => {
              // Imprimir cada item para depurar
              console.log('Procesando usuario:', item.usuario.username, 'con datos:', item);

              return {
                usuario: {
                  username: item.usuario.username || '',
                  area: item.usuario.area || '',
                  roles: item.usuario.roles || '',
                  active: item.usuario.active !== undefined ? item.usuario.active : true
                },
                estadisticas: {
                  total_seguimientos: item.estadisticas.total_seguimientos || 0,
                  ultima_modificacion: item.estadisticas.ultima_modificacion ? {
                    anio: item.estadisticas.ultima_modificacion.anio || 0,
                    folio: item.estadisticas.ultima_modificacion.folio || 0,
                    num_oficio: item.estadisticas.ultima_modificacion.num_oficio || '',
                    estatus: item.estadisticas.ultima_modificacion.estatus || '',
                    fecha_respuesta: item.estadisticas.ultima_modificacion.fecha_respuesta || '',
                    fecha_acuse_recibido: item.estadisticas.ultima_modificacion.fecha_acuse_recibido || '',
                    atencion_otorgada: item.estadisticas.ultima_modificacion.atencion_otorgada || '',
                    ultimo_seguimiento: {
                      createdAt: item.estadisticas.ultima_modificacion.ultimo_seguimiento?.createdAt || '',
                      updatedAt: item.estadisticas.ultima_modificacion.ultimo_seguimiento?.updatedAt || ''
                    }
                  } : null
                }
              };
            });

            console.log('Datos transformados:', this.usuariosActividad);
            this.filtrarUsuariosPorPermisos();
            this.totalUsuarios = this.usuariosActividad.length;
          } else {
            this.usuariosActividad = [];
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar actividad de usuarios:', error);
          this.alertService.error('Error al cargar la información de actividad de usuarios');
        }
      });
  }

  filtrarUsuariosPorPermisos(): void {
    console.log('Filtrando usuarios por permisos. Usuario actual:', {
      isAdmin: this.isAdmin,
      isDirectorGeneral: this.isDirectorGeneral,
      userArea: this.userArea
    });

    // Verificamos que existan datos antes de filtrar
    if (!this.usuariosActividad || this.usuariosActividad.length === 0) {
      console.log('No hay datos de usuarios para filtrar');
      this.usuariosActividadFiltrados = [];
      return;
    }

    // Si es admin, puede ver todos los usuarios
    if (this.isAdmin) {
      console.log('Usuario es admin, mostrando todos los usuarios');
      this.usuariosActividadFiltrados = [...this.usuariosActividad];
      return;
    }

    // Si es director general, solo ve usuarios de sus áreas
    if (this.isDirectorGeneral) {
      const areasPermitidas = this.allowedAreas;
      console.log('Usuario es director general, áreas permitidas:', areasPermitidas);
      this.usuariosActividadFiltrados = this.usuariosActividad.filter(item =>
        areasPermitidas.includes(item.usuario.area)
      );
      return;
    }

    // Otros roles solo ven su área
    console.log('Usuario normal, filtrando por área:', this.userArea);
    this.usuariosActividadFiltrados = this.usuariosActividad.filter(item =>
      item.usuario.area === this.userArea
    );

    console.log('Usuarios filtrados:', this.usuariosActividadFiltrados.length);
  }

  filtrarUsuarioPorNombre(): void {
    if (!this.filtroUsuario.trim()) {
      this.filtrarUsuariosPorPermisos();
      return;
    }

    const filtro = this.filtroUsuario.toLowerCase().trim();
    this.usuariosActividadFiltrados = this.usuariosActividad.filter(item =>
      (item.usuario.username.toLowerCase().includes(filtro) ||
       item.usuario.area.toLowerCase().includes(filtro)) &&
      this.tienePermisoParaVerUsuario(item.usuario.area)
    );
  }

  tienePermisoParaVerUsuario(areaUsuario: string): boolean {
    if (this.isAdmin) return true;
    if (this.isDirectorGeneral) return this.allowedAreas.includes(areaUsuario);
    return areaUsuario === this.userArea;
  }

  obtenerFechaFormateada(fecha: string | null): string {
    if (!fecha) return 'Sin registro';
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') || 'Fecha inválida';
  }

  setActiveTab(index: number): void {
    this.activeTab = index;
    if (index === 3) { // Si es la pestaña de actividad de usuarios
      this.loadUserActivityData();
    }

    // Si se selecciona la pestaña de logs, preparar datos
    if (index === 4 && this.canViewSection('logs')) {
      // Datos ya están configurados por tener las propiedades userRole y userArea
    }
  }

  canViewSection(section: string): boolean {
    switch (section) {
      case 'users':
        return this.isAdmin;
      case 'statistics':
        return true; // Todos pueden ver estadísticas, con filtros según permisos
      case 'logs':
        return this.isAdmin || this.isDirectorGeneral;
      case 'activity':
        return true; // Todos pueden ver la actividad, con filtros según permisos
      default:
        return false;
    }
  }

  applyFilters(): void {
    this.loadStatisticsData();
  }

  resetFilters(): void {
    this.dateFrom = null;
    this.dateTo = null;
    this.selectedArea = this.isAdmin ? 'todas' : this.allowedAreas[0] || '';
    this.loadStatisticsData();
  }

  mostrarDetallesUsuario(item: UsuarioEstadisticas): void {
    if (!item.estadisticas.ultima_modificacion) return;

    // Determinar el color del badge de estatus
    const estatusClass = item.estadisticas.ultima_modificacion.estatus === 'ATENDIDO'
      ? 'bg-green-100 text-green-600 border-green-200'
      : 'bg-red-100 text-red-600 border-red-200';

    // HTML mejorado con Tailwind
    const detalles = `
      <div class="mb-6">
        <!-- Información del encabezado integrada en el contenido -->
        <div class="flex items-center mb-5">
          <div class="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4 shadow-sm">
            <span class="text-lg font-semibold text-blue-600">${item.usuario.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-800">Detalles de actividad</h3>
            <p class="text-sm text-gray-500">${item.usuario.username} - ${item.usuario.area}</p>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-b border-gray-200 mb-5"></div>

        <!-- Bloques de información principales -->
        <div class="flex flex-col space-y-4">
          <!-- Bloque de identificación -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Oficio</p>
                <p class="text-base font-medium text-gray-800">${item.estadisticas.ultima_modificacion.num_oficio || 'No especificado'}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Folio</p>
                <p class="text-base font-medium text-gray-800">${item.estadisticas.ultima_modificacion.anio}-${item.estadisticas.ultima_modificacion.folio}</p>
              </div>
            </div>
          </div>

          <!-- Estatus con insignia -->
          <div>
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estatus</p>
            <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${estatusClass} border">
              ${item.estadisticas.ultima_modificacion.estatus}
            </span>
          </div>

          <!-- Fechas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fecha de respuesta</p>
              <p class="text-base text-gray-700">${this.obtenerFechaFormateada(item.estadisticas.ultima_modificacion.fecha_respuesta)}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fecha de acuse</p>
              <p class="text-base text-gray-700">${this.obtenerFechaFormateada(item.estadisticas.ultima_modificacion.fecha_acuse_recibido)}</p>
            </div>
          </div>

          <!-- Atención otorgada -->
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Atención otorgada</p>
            <p class="text-base text-gray-700">${item.estadisticas.ultima_modificacion.atencion_otorgada || 'No especificada'}</p>
          </div>

          <!-- Última actualización -->
          <div class="border-t border-gray-200 pt-3 mt-2">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Última actualización</p>
            <p class="text-sm text-gray-600">${this.obtenerFechaFormateada(item.estadisticas.ultima_modificacion.ultimo_seguimiento?.updatedAt)}</p>
          </div>
        </div>
      </div>
    `;

    // Configuración mejorada de SweetAlert2
    Swal.fire({
      html: detalles, // Usamos solo html y no title
      showClass: {
        popup: 'animate__animated animate__fadeIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster'
      },
      customClass: {
        container: 'swal-custom-container',
        popup: 'rounded-xl shadow-xl max-w-lg',
        htmlContainer: 'p-0 m-0', // Importante para que no tenga padding adicional
        actions: 'pb-4 px-4',
        confirmButton: 'rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      },
      width: 'auto',
      padding: 0, // Sin padding para controlar todo desde el HTML
      buttonsStyling: false,
      showCancelButton: false,
      confirmButtonText: 'Cerrar',
      backdrop: true,
      allowOutsideClick: true
    });
  }

  // Métodos específicos para obtener estadísticas por área
  getTotalRegistrosArea(area: string): number {
    return this.areaStats.get(area)?.total || 0;
  }

  getRegistrosAtendidosArea(area: string): number {
    return this.areaStats.get(area)?.atendidos || 0;
  }

  getRegistrosSinAtenderArea(area: string): number {
    return this.areaStats.get(area)?.sinAtender || 0;
  }

  getPorcentajeAtendidosArea(area: string): number {
    const stats = this.areaStats.get(area);
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.atendidos / stats.total) * 100);
  }

  getPorcentajeSinAtenderArea(area: string): number {
    const stats = this.areaStats.get(area);
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.sinAtender / stats.total) * 100);
  }

  getRespuestasRegistradasArea(area: string): number {
    return this.areaStats.get(area)?.respuestasRegistradas || 0;
  }

  getPorcentajeRespuestasRegistradasArea(area: string): number {
    const stats = this.areaStats.get(area);
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.respuestasRegistradas / stats.total) * 100);
  }

  getPorcentajeEnProcesoArea(area: string): number {
    const stats = this.areaStats.get(area);
    if (!stats || stats.total === 0) return 0;
    const enProceso = stats.atendidos - (stats.respuestasRegistradas || 0);
    return Math.round((enProceso / stats.total) * 100);
  }

  // Método para obtener el color de fondo según el porcentaje de atención
  getColorClaseForPorcentaje(porcentaje: number): string {
    if (porcentaje > 80) return 'bg-[var(--success-500)]';
    if (porcentaje > 50) return 'bg-[var(--warning-500)]';
    return 'bg-[var(--error-500)]';
  }
}
