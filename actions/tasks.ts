'use server'

import { createClient } from '../lib/supabase/server'
import type { Task, TaskStatus } from '../lib/types'

const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']
const TITLE_MAX_LENGTH = 500

function assertId(id: string, label: string): asserts id is string {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error(`${label} is required`)
  }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('status')
    .order('order')

  if (error) throw error
  return (data ?? []) as Task[]
}

export async function createTask(params: {
  title: string
  description?: string | null
  status?: TaskStatus
  order?: number
}): Promise<Task> {
  const title = typeof params.title === 'string' ? params.title.trim() : ''
  if (!title) throw new Error('Task title is required')
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error(`Title must be ${TITLE_MAX_LENGTH} characters or less`)
  }
  const status = params.status && VALID_STATUSES.includes(params.status)
    ? params.status
    : 'todo'
  const order = typeof params.order === 'number' && Number.isFinite(params.order)
    ? Math.max(0, Math.floor(params.order))
    : 0

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: params.description ?? null,
      status,
      order,
    })
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<Task> {
  assertId(id, 'Task id')
  if (!VALID_STATUSES.includes(status)) {
    throw new Error('Invalid status')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function updateTaskOrder(id: string, order: number): Promise<Task> {
  assertId(id, 'Task id')
  const orderNum = Number.isFinite(order) ? Math.floor(order) : 0

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ order: orderNum })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string): Promise<void> {
  assertId(id, 'Task id')

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
