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
