-- Fix: cortex_messages table may exist without the position column if the
-- original migration (202605130001_cortex_chat_persistence.sql) was reapplied
-- after manual/earlier table creation.  create table if not exists does not
-- add missing columns, so the subsequent index creation fails with:
--   ERROR: column "position" does not exist

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cortex_messages'
      and column_name = 'position'
  ) then
    alter table public.cortex_messages
      add column position integer not null default 0;
  end if;
end;
$$;
