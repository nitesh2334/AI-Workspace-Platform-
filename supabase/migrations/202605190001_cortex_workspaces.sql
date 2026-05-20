-- ============================================================
-- Workspace v1 — minimal workspace isolation layer
--
-- Design:
--   - cortex_workspaces: top-level workspace entity
--   - cortex_workspace_members: ownership & future multi-user
--   - workspace_id added only to tables that need direct scoping:
--       conversations, memory, documents
--   - Messages inherit via conversation_id join
--   - Document chunks inherit via document_id join
--   - Usage remains global (not workspace-scoped)
--
-- Backward compatibility:
--   - Existing users get an automatic "Default" workspace
--   - All existing records backfilled with that workspace_id
--   - Existing RLS (auth.uid() = user_id) is preserved unchanged
-- ============================================================

-- ─── 1. Core workspace tables ───────────────────────────────

create table if not exists public.cortex_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cortex_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cortex_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Index for fast member lookup
create index if not exists cortex_workspace_members_user_idx
  on public.cortex_workspace_members (user_id);

-- ─── 2. Add workspace_id to existing tables ─────────────────

alter table public.cortex_conversations
  add column if not exists workspace_id uuid
  references public.cortex_workspaces(id) on delete cascade;

alter table public.cortex_memory
  add column if not exists workspace_id uuid
  references public.cortex_workspaces(id) on delete cascade;

alter table public.cortex_documents
  add column if not exists workspace_id uuid
  references public.cortex_workspaces(id) on delete cascade;

-- ─── 3. Backfill: default workspace per user ────────────────

-- Create a "Default" workspace for every user who has data
do $$
begin
  -- From conversations
  insert into public.cortex_workspaces (user_id, name)
  select distinct user_id, 'Default'
  from public.cortex_conversations
  where user_id is not null
    and not exists (
      select 1 from public.cortex_workspaces w
      where w.user_id = public.cortex_conversations.user_id
    )
  on conflict do nothing;

  -- From memory (users who have memory but no conversations)
  insert into public.cortex_workspaces (user_id, name)
  select distinct user_id, 'Default'
  from public.cortex_memory
  where user_id is not null
    and not exists (
      select 1 from public.cortex_workspaces w
      where w.user_id = public.cortex_memory.user_id
    )
  on conflict do nothing;

  -- From documents (users who have docs but nothing else)
  insert into public.cortex_workspaces (user_id, name)
  select distinct user_id, 'Default'
  from public.cortex_documents
  where user_id is not null
    and not exists (
      select 1 from public.cortex_workspaces w
      where w.user_id = public.cortex_documents.user_id
    )
  on conflict do nothing;
end;
$$;

-- Create membership records for all workspaces
insert into public.cortex_workspace_members (workspace_id, user_id, role)
select id, user_id, 'owner'
from public.cortex_workspaces
on conflict (workspace_id, user_id) do nothing;

-- Backfill workspace_id on existing conversations
update public.cortex_conversations c
set workspace_id = w.id
from public.cortex_workspaces w
where w.user_id = c.user_id
  and c.workspace_id is null;

-- Backfill workspace_id on existing memory
update public.cortex_memory m
set workspace_id = w.id
from public.cortex_workspaces w
where w.user_id = m.user_id
  and m.workspace_id is null;

-- Backfill workspace_id on existing documents
update public.cortex_documents d
set workspace_id = w.id
from public.cortex_workspaces w
where w.user_id = d.user_id
  and d.workspace_id is null;

-- ─── 4. Make workspace_id NOT NULL ──────────────────────────

alter table public.cortex_conversations
  alter column workspace_id set not null;

alter table public.cortex_memory
  alter column workspace_id set not null;

alter table public.cortex_documents
  alter column workspace_id set not null;

-- ─── 5. Update constraints & indexes ────────────────────────

-- Migrate memory unique constraint from (user_id, key) to (workspace_id, key)
-- Drop by both possible auto-generated names (PostgreSQL convention is table_col1_col2_key)
alter table public.cortex_memory
  drop constraint if exists cortex_memory_user_id_key;

alter table public.cortex_memory
  drop constraint if exists cortex_memory_key_key;

alter table public.cortex_memory
  drop constraint if exists cortex_memory_workspace_id_key;

alter table public.cortex_memory
  add constraint cortex_memory_workspace_id_key
  unique (workspace_id, key);

-- Add workspace-scoped conversation index (keep the old user_id index for backward compat)
create index if not exists cortex_conversations_user_updated_idx
  on public.cortex_conversations (user_id, updated_at desc);
create index if not exists cortex_conversations_workspace_updated_idx
  on public.cortex_conversations (workspace_id, updated_at desc);

-- Add workspace index on documents
create index if not exists cortex_documents_workspace_created_idx
  on public.cortex_documents (workspace_id, created_at desc);

-- ─── 6. Update match_document_chunks RPC for workspace scoping ──

create or replace function public.match_document_chunks(
  p_user_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count int default 5,
  p_min_similarity float default 0.5,
  p_workspace_id uuid default null
) returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_filename text,
  "position" integer
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ch.id,
    ch.document_id,
    ch.content,
    1 - (ch.embedding <=> p_query_embedding) as similarity,
    d.filename as document_filename,
    ch.position
  from public.cortex_document_chunks ch
  join public.cortex_documents d on d.id = ch.document_id
  where ch.user_id = p_user_id
    and (p_workspace_id is null or d.workspace_id = p_workspace_id)
    and ch.embedding is not null
    and 1 - (ch.embedding <=> p_query_embedding) > p_min_similarity
  order by ch.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

-- ─── 7. RLS for workspace tables ────────────────────────────
-- Note: existing table RLS (auth.uid() = user_id) is unchanged.
-- Workspace membership is enforced at the application layer.

alter table public.cortex_workspaces enable row level security;
alter table public.cortex_workspace_members enable row level security;

create policy "Users can read their workspaces"
  on public.cortex_workspaces for select
  using (auth.uid() = user_id);

create policy "Users can create workspaces"
  on public.cortex_workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their workspaces"
  on public.cortex_workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their workspaces"
  on public.cortex_workspaces for delete
  using (auth.uid() = user_id);

create policy "Users can read their workspace memberships"
  on public.cortex_workspace_members for select
  using (auth.uid() = user_id);

create policy "Users can manage their workspace memberships"
  on public.cortex_workspace_members for insert
  with check (auth.uid() = user_id);
