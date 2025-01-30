import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { Router } from '@angular/router';
import { AuthStateService } from '../../core/auth/authstate.service';

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
    ReactiveFormsModule
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  isLoggedIn = false;
  isLoginFailed = false;
  errorMessage = '';
  roles: string[] = [];

  loginForm = new FormGroup({
    usuario: new FormControl(''),
    contrasena: new FormControl('')
  });

  constructor (
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private authStateService: AuthStateService
  ) {

  }

  ngOnInit(): void {
    if (this.tokenStorage.getToken()) {
      this.authStateService.login();
      this.router.navigate(['/Entradas']); // Redirige si ya está logueado
    }
    this.loginForm = new FormGroup({
      usuario: new FormControl('', [Validators.required]),
      contrasena: new FormControl('', [Validators.required])
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      // const { usuario, contrasena } = this.loginForm.value;
      const usuario = this.loginForm.value.usuario!;
      const contrasena = this.loginForm.value.contrasena!;

      this.authService.login(usuario, contrasena).subscribe({
        next: data => {
          this.tokenStorage.saveToken(data.accessToken);
          this.tokenStorage.saveUser(data);

          this.isLoginFailed = false;
          // this.isLoggedIn = true;
          // this.roles = this.tokenStorage.getUser().roles;
          // this.router.navigate(['/Entradas']);
          this.roles = this.tokenStorage.getUser()?.roles || []; // Manejo de null
          this.authStateService.login(); // Llama a authStateService.login() ANTES de navegar
          this.router.navigate(['/Entradas']);
        },
        error: err => {
          this.errorMessage = err.error.message;
          this.isLoginFailed = true;
        }
      });
    }
  }
}
