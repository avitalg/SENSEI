// Domain model types — the shape the frontend expects from the backend (mirrors
// the current seed data in src/data/seed.ts, which is the interim source of
// truth). When a real backend is connected, these become the API contract.

export type RiskLevel = 'high' | 'medium' | 'low' | 'none'
export type Gender = 'נ' | 'ז' | string

export interface Patient {
  id: string
  name: string
  age: number
  gender: Gender
  focus: string
  risk: RiskLevel
  sessions: number
  lastSession: string
  phone: string
  email: string
  since: string
  initials: string
  color: string
}

export interface Task {
  id: string
  text: string
  patient: string
  patientId: string
  due: string
  overdue: boolean
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

export interface DocumentRecord {
  id: string
  pid: string
  type: string
  date: string
  status: 'signed' | 'pending' | 'draft'
}

export interface NotificationRecord {
  id: string
  kind: 'summary' | 'risk' | 'reminder' | 'system'
  pid: string | null
  title: string
  text: string
  time: string
  group: string
}

export interface UserProfile {
  name: string
  title: string
  gender: Gender
  email: string
  phone: string
  license: string
  org: string
  bio?: string
  avatar?: string
  avatarColor?: string
}

// ---- API envelope types ----
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  filter?: Record<string, string | number | boolean>
}
