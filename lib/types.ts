export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  order: number
  created_at: string
}

export interface InsertTask {
  title: string
  description?: string | null
  status: TaskStatus
  order?: number
}
