import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { areaAccessGuard } from '../core/guards/area-access.guard';
import { RolesEnum } from '../core/models/enums/roles.enum';

export const routes: Routes = [
  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('../features/login/login.component').then(c => c.LoginComponent),
    pathMatch: 'full'
  },

  // Rutas protegidas (requieren autenticación)
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'Entradas',
        loadComponent: () => import('../features/main/main.component').then(c => c.MainComponent),
        canActivate: [authGuard]
      },
      // {
      //   path: 'editar-entrada/:id',
      //   loadComponent: () => import('../features/shared/editar-entrada/editar-entrada.component').then(c => c.EditarEntradaComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'nueva-entrada',
      //   loadComponent: () => import('../features/shared/nueva-entrada/nueva-entrada.component').then(c => c.NuevaEntradaComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'nueva-entrada-antiguos',
      //   loadComponent: () => import('../features/shared/nueva-entrada-antiguos/nueva-entrada-antiguos.component').then(c => c.NuevaEntradaAntiguosComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'editar-seguimiento/:id',
      //   loadComponent: () => import('../features/shared/editar-seguimiento/editar-seguimiento.component').then(c => c.EditarSeguimientoComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'ficha_tecnica/:id',
      //   loadComponent: () => import('../features/shared/ficha-tecnica/ficha-tecnica.component').then(c => c.FichaTecnicaComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'Entradas/panel-control',
      //   loadComponent: () => import('../features/shared/panel-control/panel-control.component').then(c => c.PanelControlComponent),
      //   canActivate: [areaAccessGuard]
      // },
      // {
      //   path: 'Perfil',
      //   loadComponent: () => import('../features/user-panel/user-panel.component').then(c => c.UserPanelComponent),
      //   canActivate: [areaAccessGuard]
      // },
      {
        path: 'Catalogos',
        loadComponent: () => import('../features/catalogs/catalogs.component').then(m => m.CatalogsComponent),
        canActivate: [authGuard],
        data: {
          roles: [RolesEnum.ADMIN],
          breadcrumb: 'Catálogos'
        }
      },
      {
        path: 'Administracion',
        loadComponent: () => import('../features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
        canActivate: [authGuard],
        data: {
          roles: [RolesEnum.ADMIN, RolesEnum.DIRECTOR_GENERAL, RolesEnum.DIRECTOR],
          breadcrumb: 'Panel de Administración'
        }
      },
      {
        path: 'Entradas/Ficha-tecnica/:id',
        loadComponent: () => import('../features/shared/ficha-tecnica-profesional/ficha-tecnica-profesional.component').then(m => m.FichaTecnicaProfesionalComponent),
        canActivate: [authGuard],
      },
      {
        path: '',
        redirectTo: 'Entradas', // Redirige a /Entradas cuando está autenticado
        pathMatch: 'full'
      }
    ]
  },

  // Rutas de falback y error
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
