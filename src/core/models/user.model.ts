export interface User {
  _id: string;
  username: string;
  email: string;
  area: string;
  roles: string;
  active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
