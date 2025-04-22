import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/api/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { NgClass, NgIf } from '@angular/common';
import { AlertService } from '../../core/services/ui/alert.service';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    NgIf,
    NgClass
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  // Inyección de dependencias usando la nueva sintaxis
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // Añadir ActivatedRoute
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  loading = false;
  showPassword = false;
  errorMessage = '';
  loginForm!: FormGroup;

  ngOnInit(): void {
    // Verificar si ya hay sesión activa
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/Entradas']);
      return;
    }

    // Inicializar formulario
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Muestra u oculta la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Procesa el envío del formulario
   */
  onSubmit(): void {
    // Limpiar mensaje de error previo
    this.errorMessage = '';

    // Validar formulario
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    // Verificar que username y password no sean undefined
    if (!username || !password) {
      this.errorMessage = 'Usuario y contraseña son requeridos';
      this.loading = false;
      return;
    }

    this.authService.login(username, password)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          console.log('Login exitoso, intentando guardar...');

          // Guardar el token manualmente como backup
          if (response.accessToken) {
            try {
              window.localStorage.setItem('manual-token-test', response.accessToken);
              console.log('Token backup guardado:', !!window.localStorage.getItem('manual-token-test'));
            } catch (e) {
              console.error('Error al guardar backup:', e);
            }
          }

          // Verificar almacenamiento después de un breve retraso
          setTimeout(() => {
            // Verificar directamente en window.localStorage
            const tokenInStorage = window.localStorage.getItem('token');
            console.log('¿Token en localStorage después de timeout?', !!tokenInStorage);

            // Usar los datos guardados manualmente si es necesario
            if (!tokenInStorage && response.accessToken) {
              console.log('Usando datos guardados manualmente');
              window.localStorage.setItem('token', response.accessToken);
              window.localStorage.setItem('user', JSON.stringify(response.user));
              this.authService.reloadAuthState();
            }

            // Navegar a la ruta adecuada
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/Entradas';
            this.router.navigate([returnUrl]);
          }, 300);
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.errorMessage = error.error?.message || 'Usuario o contraseña incorrectos';
          this.alertService.error(this.errorMessage);
        }
      });
  }
}
