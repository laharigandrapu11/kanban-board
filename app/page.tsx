'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { getTasks, createTask, updateTaskStatus, deleteTask } from '../actions/tasks'
import { createClient } from '../lib/supabase'
import type { Task, TaskStatus } from '../lib/types'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]

const STATUS_SET = new Set<TaskStatus>(COLUMNS.map((c) => c.id))

function tasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const out: Record<TaskStatus, Task[]> = {
    todo: [],
    'in-progress': [],
    done: [],
  }
  for (const t of tasks) {
    const status = STATUS_SET.has(t.status) ? t.status : 'todo'
    out[status].push(t)
  }
  for (const status of COLUMNS.map((c) => c.id)) {
    out[status].sort((a, b) => a.order - b.order)
  }
  return out
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addTaskColumn, setAddTaskColumn] = useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    let cancelled = false
    getTasks()
      .then((data) => {
        if (!cancelled) setTasks(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tasks')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    try {
      const supabase = createClient()
      channel = supabase
        .channel('tasks-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const newTask = payload.new as Task
              if (!newTask?.id) return
              setTasks((prev) =>
                prev.some((t) => t.id === newTask.id) ? prev : [...prev, newTask]
              )
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = payload.new as Task
              if (!updated?.id) return
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              )
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const oldRow = payload.old as { id?: string }
              if (oldRow?.id == null) return
              setTasks((prev) => prev.filter((t) => t.id !== oldRow.id))
            }
          }
        )
        .subscribe()
      return () => {
        if (channel) supabase.removeChannel(channel)
      }
    } catch {
      return () => {}
    }
  }, [])

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const newStatus = destination.droppableId as TaskStatus
    const grouped = tasksByStatus(tasks)
    const columnTasks = grouped[source.droppableId as TaskStatus]
    const task = columnTasks[source.index]
    if (!task) return

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      )
    )
    try {
      await updateTaskStatus(task.id, newStatus)
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: task.status } : t
        )
      )
      setError(e instanceof Error ? e.message : 'Failed to update task')
    }
  }

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTask(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task')
      getTasks()
        .then(setTasks)
        .catch(() => setError('Delete failed. Could not refresh list.'))
    }
  }

  const submitNewTask = async (status: TaskStatus) => {
    const title = newTaskTitle.trim()
    if (!title) return
    const prevTitle = newTaskTitle
    const prevColumn = addTaskColumn
    setNewTaskTitle('')
    setAddTaskColumn(null)
    try {
      const grouped = tasksByStatus(tasks)
      const order = grouped[status].length
      const task = await createTask({ title, status, order })
      setTasks((prev) => [...prev, task])
    } catch (e) {
      setNewTaskTitle(prevTitle)
      setAddTaskColumn(prevColumn)
      setError(e instanceof Error ? e.message : 'Failed to create task')
    }
  }

  const dismissError = () => {
    setError(null)
  }

  const retryLoad = () => {
    setError(null)
    setLoading(true)
    getTasks()
      .then((data) => setTasks(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tasks'))
      .finally(() => setLoading(false))
  }

  const openAddTask = (status: TaskStatus) => {
    setAddTaskColumn(status)
    setNewTaskTitle('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
        <header className="border-b border-slate-200/60 bg-white/70 px-4 py-5 backdrop-blur sm:px-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
        </header>
        <div className="flex gap-4 overflow-x-auto p-4 sm:gap-6 sm:p-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex w-[280px] shrink-0 flex-col rounded-xl bg-white/80 shadow-sm ring-1 ring-slate-200/80 sm:w-80"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="min-h-[140px] space-y-2 p-3">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-12 animate-pulse rounded-lg bg-slate-100"
                    style={{ animationDelay: `${(i * 3 + j) * 50}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
        <header className="border-b border-slate-200/60 bg-white/70 px-4 py-5 backdrop-blur sm:px-6">
          <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">
            Kanban Board
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <p className="rounded-lg bg-red-50 px-4 py-2 text-red-700">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismissError}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={retryLoad}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const grouped = tasksByStatus(tasks)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      <header className="border-b border-slate-200/60 bg-white/70 px-4 py-5 backdrop-blur sm:px-6">
        <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">
          Kanban Board
        </h1>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto px-4 py-6 pb-6 sm:gap-6 sm:px-6">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="flex w-[280px] min-w-[280px] shrink-0 flex-col rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 sm:w-80 sm:min-w-0"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium text-slate-700">{col.title}</h2>
                  <button
                    type="button"
                    onClick={() => openAddTask(col.id)}
                    className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    Add task
                  </button>
                </div>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] flex-1 space-y-2 p-3 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-slate-50/80' : ''
                    }`}
                  >
                    {addTaskColumn === col.id && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitNewTask(col.id)
                            if (e.key === 'Escape') {
                              setAddTaskColumn(null)
                              setNewTaskTitle('')
                            }
                          }}
                          placeholder="Task title..."
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => submitNewTask(col.id)}
                          disabled={!newTaskTitle.trim()}
                          className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-700"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {grouped[col.id].length === 0 && addTaskColumn !== col.id && (
                      <p className="rounded-lg py-6 text-center text-sm text-slate-400">
                        No tasks yet
                      </p>
                    )}
                    {grouped[col.id].map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 ease-out ${
                              snapshot.isDragging
                                ? 'rotate-2 scale-[1.02] shadow-lg ring-2 ring-slate-200'
                                : ''
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                              {task.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(task.id)
                              }}
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                              aria-label="Delete task"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
