-- Atomic replace: deletes old messages and inserts new ones in one transaction.
-- Called via supabase.rpc() from the PUT /api/conversations/[id]/messages handler.
-- Using security definer so the function bypasses RLS; ownership is verified explicitly
-- via the p_conversation_id / p_user_id lookup.

create or replace function public.replace_conversation_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_messages jsonb
) returns void
language plpgsql
security definer
as $$
declare
  msg jsonb;
  idx int := 0;
  msg_content text;
begin
  -- Verify the caller owns this conversation (fail-fast, no data touched)
  if not exists (
    select 1 from public.cortex_conversations
    where id = p_conversation_id and user_id = p_user_id
  ) then
    raise exception 'Conversation not found';
  end if;

  -- Atomically delete existing + insert new messages
  delete from public.cortex_messages
  where conversation_id = p_conversation_id
    and user_id = p_user_id;

  for msg in select * from jsonb_array_elements(p_messages)
  loop
    -- Extract text content from parts array (mirrors client-side messageText())
    select coalesce(
      (select string_agg(part->>'text', '')
       from jsonb_array_elements(msg->'parts') as part
       where part->>'type' = 'text'),
      ''
    ) into msg_content;

    insert into public.cortex_messages (
      conversation_id, user_id, ui_id, role, parts, content, position
    ) values (
      p_conversation_id,
      p_user_id,
      msg->>'id',
      msg->>'role',
      coalesce(msg->'parts', '[]'::jsonb),
      msg_content,
      idx
    );
    idx := idx + 1;
  end loop;
end;
$$;
