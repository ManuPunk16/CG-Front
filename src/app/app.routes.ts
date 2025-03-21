import { NuevaEntradaAntiguosComponent } from '../features/shared/nueva-entrada-antiguos/nueva-entrada-antiguos.component';
import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../features/login/login.component').then(c => c.LoginComponent),
    pathMatch: 'full' // Importante para evitar conflictos con rutas hijas
  },
  {
    path: 'Entradas',
    loadComponent: () => import('../features/main/main.component').then(c => c.MainComponent),
    canActivate:[AuthGuard] //Guarda para proteger la ruta
  },
  {
    path: 'editar-entrada/:id',
    loadComponent: () => import('../features/shared/editar-entrada/editar-entrada.component').then(c => c.EditarEntradaComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'nueva-entrada',
    loadComponent: () => import('../features/shared/nueva-entrada/nueva-entrada.component').then(c => c.NuevaEntradaComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'nueva-entrada-antiguos',
    loadComponent: () => import('../features/shared/nueva-entrada-antiguos/nueva-entrada-antiguos.component').then(c => c.NuevaEntradaAntiguosComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'editar-seguimiento/:id',
    loadComponent: () => import('../features/shared/editar-seguimiento/editar-seguimiento.component').then(c => c.EditarSeguimientoComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'ficha_tecnica/:id',
    loadComponent: () => import('../features/shared/ficha-tecnica/ficha-tecnica.component').then(c => c.FichaTecnicaComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'Entradas/panel-control',
    loadComponent: () => import('../features/shared/panel-control/panel-control.component').then(c => c.PanelControlComponent),
    canActivate:[AuthGuard]
  },
  {
    path: 'Perfil',
    loadComponent: () => import('../features/user-panel/user-panel.component').then(c => c.UserPanelComponent),
    canActivate:[AuthGuard]
  },
  {
    path: '',
    redirectTo: 'login', // Redirige a /login por defecto
    pathMatch: 'full'
  },
  {
    path: '**', // Ruta comodín para manejar rutas no encontradas (404)
    redirectTo: 'login' // Redirige a /login en caso de error
  }
];
