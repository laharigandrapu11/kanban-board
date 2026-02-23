-- Kanban tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in-progress', 'done')),
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

-- Index for listing tasks by status (common filter)
create index tasks_status_order_idx on public.tasks (status, "order");

-- Row Level Security
alter table public.tasks enable row level security;

-- Public read: allow all selects
create policy "Public read access"
  on public.tasks
  for select
  using (true);

-- Public insert: allow all inserts
create policy "Public insert access"
  on public.tasks
  for insert
  with check (true);

-- Public update: allow all updates
create policy "Public update access"
  on public.tasks
  for update
  using (true)
  with check (true);

-- Public delete: allow all deletes
create policy "Public delete access"
  on public.tasks
  for delete
  using (true);

-- Enable Realtime for tasks table
alter publication supabase_realtime add table public.tasks;
