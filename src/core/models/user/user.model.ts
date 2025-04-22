import { RolesEnum } from '../enums/roles.enum';

export interface User {
  _id: string;
  username: string;
  email: string;
  area: string;
  roles: string | RolesEnum;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserActivity {
  usuario: {
    id: string;
    username: string;
    area: string;
    roles: string;
    active: boolean;
  };
  estadisticas: {
    total_seguimientos: number;
    ultima_modificacion: {
      anio?: number;
      folio?: number;
      num_oficio?: string;
      timestamp?: Date;
      inputId?: string;
    } | null;
  };
}
