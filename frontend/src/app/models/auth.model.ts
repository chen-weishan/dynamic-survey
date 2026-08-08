export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
}
export interface AuthResponse {
  code: number;
  message: string;
  data: { token: string };
}
