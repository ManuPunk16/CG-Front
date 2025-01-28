import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../features/login/login.component').then(c => c.LoginComponent),
    pathMatch: 'full' // Importante para evitar conflictos con rutas hijas
  },
  {
    path: 'Entradas',
    loadComponent: () => import('../features/main/main.component').then(c => c.MainComponent),
    //canActivate:[AuthGuard] //Guarda para proteger la ruta
  },
  {
    path: 'editar-entrada/:id',
    loadComponent: () => import('../features/shared/editar-entrada/editar-entrada.component').then(c => c.EditarEntradaComponent),

  },
  {
    path: 'nueva-entrada',
    loadComponent: () => import('../features/shared/nueva-entrada/nueva-entrada.component').then(c => c.NuevaEntradaComponent),

  },
  {
    path: 'editar-seguimiento/:id',
    loadComponent: () => import('../features/shared/editar-seguimiento/editar-seguimiento.component').then(c => c.EditarSeguimientoComponent),

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
