-- ============================================================
-- User memory table: persistent preferences, goals, projects, background
-- Key-value store with categories and importance levels.
-- No vector search — retrieval is purely structured by category + importance.
-- ============================================================

create table if not exists public.cortex_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Memory content
  key text not null,              -- e.g. 'preference.model', 'goal.current', 'project.alpha.tech_stack', 'background.role'
  value text not null,            -- The stored memory value (plain text or JSON)

  -- Metadata
  category text not null default 'general'
    check (category in ('preference', 'goal', 'project', 'background', 'fact', 'general')),
    -- preference — UI/behavioral preferences (default model, tone, etc.)
    -- goal       — User's stated goals or objectives
    -- project    — Project-specific context (tech stack, domain, constraints)
    -- background — User's background, role, expertise level
    -- fact       — Extracted facts about the user
    -- general    — Uncategorized / misc

  importance smallint not null default 1
    check (importance between 1 and 5),
    -- 1=convenience, 5=critical (identity, project constraints)

  source text not null default 'manual'
    check (source in ('manual', 'chat_extraction', 'api', 'import')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, key)
);

-- Indexes: fast lookup by category + importance
create index cortex_memory_user_category_idx
  on public.cortex_memory (user_id, category, importance desc);

create index cortex_memory_user_importance_idx
  on public.cortex_memory (user_id, importance desc);

-- Update the updated_at timestamp automatically
create or replace function public.update_cortex_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trigger_cortex_memory_updated_at
  before update on public.cortex_memory
  for each row
  execute function public.update_cortex_memory_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.cortex_memory enable row level security;

create policy "Users can read their memory"
  on public.cortex_memory for select
  using (auth.uid() = user_id);

create policy "Users can create their memory"
  on public.cortex_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update their memory"
  on public.cortex_memory for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their memory"
  on public.cortex_memory for delete
  using (auth.uid() = user_id);

-- ─── Helper function: retrieve relevant memories for a user ──

create or replace function public.get_user_memories(
  p_user_id uuid,
  p_categories text[] default null,
  p_min_importance smallint default 0,
  p_limit int default 20
) returns table (
  id uuid,
  key text,
  value text,
  category text,
  importance smallint,
  source text,
  updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    m.id,
    m.key,
    m.value,
    m.category,
    m.importance,
    m.source,
    m.updated_at
  from public.cortex_memory m
  where m.user_id = p_user_id
    and m.importance >= p_min_importance
    and (p_categories is null or m.category = any(p_categories))
  order by m.importance desc, m.updated_at desc
  limit p_limit;
end;
$$;
