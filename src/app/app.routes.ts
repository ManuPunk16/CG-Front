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
  // {
  //   path: 'inputs',
  //   loadChildren: () => import('../features/inputs/inputs.module').then(m => m.InputsModule),
  //   //canActivate:[AuthGuard] //Guarda para proteger la ruta
  // },
  //   {
  //   path: 'admin',
  //   loadChildren: () => import('../features/admin/admin.module').then(m => m.AdminModule),
  //       //canActivate:[AuthGuard] //Guarda para proteger la ruta
  // },
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
