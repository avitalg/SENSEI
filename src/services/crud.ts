// Generic REST resource service — the canonical CRUD contract every domain
// service follows (mirrors GOVERNANCE §12 `ApiService<T>`). Built on apiClient,
// so it inherits auth, timeout, and error handling. Dormant until a backend URL
// is configured.
import { apiRequest } from './apiClient'
import type { ListParams, Paginated } from '../types'

export interface ApiService<T, C = Partial<T>, U = Partial<T>> {
  list(params?: ListParams, signal?: AbortSignal): Promise<Paginated<T>>
  get(id: string, signal?: AbortSignal): Promise<T>
  create(data: C): Promise<T>
  update(id: string, data: U): Promise<T>
  remove(id: string): Promise<void>
}

export function crudService<T, C = Partial<T>, U = Partial<T>>(resource: string): ApiService<T, C, U> {
  const base = '/' + resource.replace(/^\/+|\/+$/g, '')
  return {
    list: (params, signal) =>
      apiRequest<Paginated<T>>(base, {
        query: { page: params?.page, pageSize: params?.pageSize, search: params?.search, sort: params?.sort, ...params?.filter },
        signal,
      }),
    get: (id, signal) => apiRequest<T>(`${base}/${encodeURIComponent(id)}`, { signal }),
    create: (data) => apiRequest<T>(base, { method: 'POST', body: data }),
    update: (id, data) => apiRequest<T>(`${base}/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
    remove: (id) => apiRequest<void>(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}
