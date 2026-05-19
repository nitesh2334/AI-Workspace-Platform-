-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ============================================================
-- Documents table: metadata about uploaded files
-- ============================================================
create table if not exists public.cortex_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  content_type text not null,
  size_bytes integer not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists cortex_documents_user_created_idx
  on public.cortex_documents (user_id, created_at desc);

alter table public.cortex_documents enable row level security;

create policy "Users can read their documents"
  on public.cortex_documents for select
  using (auth.uid() = user_id);

create policy "Users can create their documents"
  on public.cortex_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their documents"
  on public.cortex_documents for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Document chunks table: content + vector embeddings
-- ============================================================
create table if not exists public.cortex_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cortex_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536),
  position integer not null,
  created_at timestamptz not null default now()
);

create index if not exists cortex_chunks_document_position_idx
  on public.cortex_document_chunks (document_id, position asc);

-- pgvector index for similarity search (IVFFlat — good balance of speed/recall)
create index if not exists cortex_chunks_embedding_idx
  on public.cortex_document_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

alter table public.cortex_document_chunks enable row level security;

create policy "Users can read their chunks"
  on public.cortex_document_chunks for select
  using (auth.uid() = user_id);

create policy "Users can create their chunks"
  on public.cortex_document_chunks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their chunks"
  on public.cortex_document_chunks for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Similarity search function
-- ============================================================
-- Returns chunks sorted by cosine similarity, scoped to a single user.
-- The caller is responsible for passing the authenticated user_id.
create or replace function public.match_document_chunks(
  p_user_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count int default 5,
  p_min_similarity float default 0.5
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
    and ch.embedding is not null
    and 1 - (ch.embedding <=> p_query_embedding) > p_min_similarity
  order by ch.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

-- ============================================================
-- Storage bucket for uploaded files
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cortex-files',
  'cortex-files',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown']
)
on conflict (id) do nothing;

-- RLS for storage: users can only access their own folder (user_id/filename)
create policy "Users can CRUD their own files"
  on storage.objects
  for all
  using (
    bucket_id = 'cortex-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cortex-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
