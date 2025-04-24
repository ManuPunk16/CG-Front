import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, finalize } from 'rxjs';

import { UserService } from '../../../../core/services/api/user.service';
import { AlertService } from '../../../../core/services/ui/alert.service';
import { User } from '../../../../core/models/user/user.model';
import { RolesEnum } from '../../../../core/models/enums/roles.enum';
import { AreasEnum } from '../../../../core/models/enums/areas.enum';

// Sweet Alert
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['username', 'email', 'area', 'roles', 'active', 'actions'];
  dataSource = new MatTableDataSource<User>();

  roleOptions = Object.values(RolesEnum);
  areaOptions = Object.values(AreasEnum);

  isLoading = false;
  filterValue = '';

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private alertService: AlertService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.isLoading = true;

    this.userService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.dataSource.data = response.data;
          } else {
            this.dataSource.data = [];
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
          this.alertService.error('No se pudieron cargar los usuarios');
        }
      });
  }

  applyFilter(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = this.filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openCreateDialog(): void {
    Swal.fire({
      title: 'Crear Nuevo Usuario',
      html: `
        <form id="userForm" class="space-y-4">
          <div class="mb-3">
            <label for="username" class="block text-sm font-medium text-gray-700">Usuario</label>
            <input id="username" class="swal2-input" placeholder="Usuario">
          </div>
          <div class="mb-3">
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" class="swal2-input" placeholder="Email">
          </div>
          <div class="mb-3">
            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
            <input id="password" type="password" class="swal2-input" placeholder="Contraseña">
          </div>
          <div class="mb-3">
            <label for="area" class="block text-sm font-medium text-gray-700">Área</label>
            <select id="area" class="swal2-select">
              ${this.areaOptions.map(area => `<option value="${area}">${area}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label for="roles" class="block text-sm font-medium text-gray-700">Rol</label>
            <select id="roles" class="swal2-select">
              ${this.roleOptions.map(role => `<option value="${role}">${role}</option>`).join('')}
            </select>
          </div>
        </form>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      focusConfirm: false,
      preConfirm: () => {
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const area = (document.getElementById('area') as HTMLSelectElement).value;
        const roles = (document.getElementById('roles') as HTMLSelectElement).value;

        // Validación básica
        if (!username || !password || !email || !area || !roles) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        return { username, email, password, area, roles, active: true };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.createUser(result.value);
      }
    });
  }

  createUser(userData: any): void {
    this.isLoading = true;

    this.userService.createUser(userData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: '¡Usuario creado!',
            text: 'El usuario ha sido creado exitosamente',
            confirmButtonColor: '#3085d6',
            timer: 2000,
            timerProgressBar: true
          });
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
          let errorMessage = 'Error al crear el usuario';

          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#3085d6'
          });
        }
      });
  }

  openEditDialog(user: User): void {
    Swal.fire({
      title: 'Editar Usuario',
      html: `
        <form id="userForm" class="space-y-4">
          <div class="mb-3">
            <label for="username" class="block text-sm font-medium text-gray-700">Usuario</label>
            <input id="username" class="swal2-input" value="${user.username}" disabled>
          </div>
          <div class="mb-3">
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" class="swal2-input" value="${user.email}" placeholder="Email">
          </div>
          <div class="mb-3">
            <label for="area" class="block text-sm font-medium text-gray-700">Área</label>
            <select id="area" class="swal2-select">
              ${this.areaOptions.map(area =>
                `<option value="${area}" ${area === user.area ? 'selected' : ''}>${area}</option>`
              ).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label for="roles" class="block text-sm font-medium text-gray-700">Rol</label>
            <select id="roles" class="swal2-select">
              ${this.roleOptions.map(role =>
                `<option value="${role}" ${role === user.roles ? 'selected' : ''}>${role}</option>`
              ).join('')}
            </select>
          </div>
        </form>
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      focusConfirm: false,
      preConfirm: () => {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const area = (document.getElementById('area') as HTMLSelectElement).value;
        const roles = (document.getElementById('roles') as HTMLSelectElement).value;

        // Validaciones
        if (!email || !area || !roles) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        return { email, area, roles };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.updateUser(user._id, result.value);
      }
    });
  }

  updateUser(id: string, userData: any): void {
    this.isLoading = true;

    this.userService.updateUser(id, userData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: '¡Usuario actualizado!',
            text: 'El usuario ha sido actualizado exitosamente',
            confirmButtonColor: '#3085d6',
            timer: 2000,
            timerProgressBar: true
          });
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          let errorMessage = 'Error al actualizar el usuario';

          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#3085d6'
          });
        }
      });
  }

  openResetPasswordDialog(user: User): void {
    Swal.fire({
      title: `Restablecer Contraseña: ${user.username}`,
      html: `
        <div class="mb-3">
          <label for="newPassword" class="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
          <input id="newPassword" type="password" class="swal2-input" placeholder="Nueva contraseña">
        </div>
        <div class="mb-3">
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
          <input id="confirmPassword" type="password" class="swal2-input" placeholder="Confirmar contraseña">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      focusConfirm: false,
      preConfirm: () => {
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

        // Validaciones
        if (!newPassword) {
          Swal.showValidationMessage('Debe ingresar una contraseña');
          return false;
        }

        if (newPassword.length < 6) {
          Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
          return false;
        }

        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('Las contraseñas no coinciden');
          return false;
        }

        return { password: newPassword };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.changePassword(user._id, result.value);
      }
    });
  }

  changePassword(id: string, passwordData: any): void {
    this.isLoading = true;

    this.userService.changePassword(id, passwordData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: '¡Contraseña actualizada!',
            text: 'La contraseña ha sido cambiada exitosamente',
            confirmButtonColor: '#3085d6',
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (error) => {
          console.error('Error al cambiar contraseña:', error);
          let errorMessage = 'Error al cambiar la contraseña';

          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#3085d6'
          });
        }
      });
  }

  confirmToggleStatus(user: User): void {
    const action = user.active ? 'desactivar' : 'activar';

    Swal.fire({
      title: `¿Estás seguro?`,
      text: `¿Deseas ${action} al usuario ${user.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.toggleUserStatus(user._id, !user.active);
      }
    });
  }

  toggleUserStatus(id: string, active: boolean): void {
    this.isLoading = true;

    this.userService.toggleUserStatus(id, active)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          const status = active ? 'activado' : 'desactivado';
          Swal.fire({
            icon: 'success',
            title: `¡Usuario ${status}!`,
            text: `El usuario ha sido ${status} exitosamente`,
            confirmButtonColor: '#3085d6',
            timer: 2000,
            timerProgressBar: true
          });
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al cambiar estado del usuario:', error);
          let errorMessage = 'Error al cambiar el estado del usuario';

          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#3085d6'
          });
        }
      });
  }

  formatDate(date: string | null): string {
    if (!date) return 'Nunca';
    const dateObj = new Date(date);
    return dateObj.toLocaleString('es-MX');
  }
}
