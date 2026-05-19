create table if not exists public.cortex_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model text not null default 'openai/gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cortex_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.cortex_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ui_id text not null,
  role text not null check (role in ('system', 'user', 'assistant', 'data')),
  parts jsonb not null default '[]'::jsonb,
  content text not null default '',
  position integer not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, ui_id)
);

create index if not exists cortex_conversations_user_updated_idx
  on public.cortex_conversations (user_id, updated_at desc);

create index if not exists cortex_messages_conversation_position_idx
  on public.cortex_messages (conversation_id, position asc);

alter table public.cortex_conversations enable row level security;
alter table public.cortex_messages enable row level security;

create policy "Users can read their conversations"
  on public.cortex_conversations for select
  using (auth.uid() = user_id);

create policy "Users can create their conversations"
  on public.cortex_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their conversations"
  on public.cortex_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their conversations"
  on public.cortex_conversations for delete
  using (auth.uid() = user_id);

create policy "Users can read their messages"
  on public.cortex_messages for select
  using (auth.uid() = user_id);

create policy "Users can create their messages"
  on public.cortex_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their messages"
  on public.cortex_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their messages"
  on public.cortex_messages for delete
  using (auth.uid() = user_id);
