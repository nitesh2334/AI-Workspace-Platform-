create table if not exists public.cortex_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  estimated_cost numeric(12,8) not null,
  created_at timestamptz not null default now()
);

create index if not exists cortex_usage_user_created_idx
  on public.cortex_usage (user_id, created_at desc);

alter table public.cortex_usage enable row level security;

create policy "Users can read their own usage"
  on public.cortex_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert their own usage"
  on public.cortex_usage for insert
  with check (auth.uid() = user_id);
