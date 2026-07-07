// Services barrel — the single entry point for backend access.
//
// Import services from here (never scatter raw fetch/axios calls). Everything is
// dormant until `VITE_API_BASE_URL` is set; see apiClient.ts and ARCHITECTURE.md
// § "Wiring a backend". Add a new resource with one line: `crudService<T>('x')`.
export * from './apiClient'
export { crudService } from './crud'
export type { ApiService } from './crud'
export * from './audio'

import { crudService } from './crud'
import type { Patient, Task, DocumentRecord, NotificationRecord } from '../types'

export const patientsApi = crudService<Patient>('patients')
export const tasksApi = crudService<Task>('tasks')
export const documentsApi = crudService<DocumentRecord>('documents')
export const notificationsApi = crudService<NotificationRecord>('notifications')

// ---- auth service (shape only; wire to the backend's real auth flow later) ----
import { apiRequest } from './apiClient'

export interface Credentials { email: string; password: string }
export interface AuthResult { token: string; expiresIn?: number }

export const authApi = {
  login: (creds: Credentials) => apiRequest<AuthResult>('/auth/login', { method: 'POST', body: creds }),
  register: (creds: Credentials & { name?: string }) => apiRequest<AuthResult>('/auth/register', { method: 'POST', body: creds }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: (signal?: AbortSignal) => apiRequest('/auth/me', { signal }),
}
