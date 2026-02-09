-- Create a function to handle user deletion
create or replace function delete_user(p_user_id uuid)
returns void
security definer
as $$
begin
  -- Verify the user exists
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0001';
  end if;

  -- Delete user from auth schema
  delete from auth.users where id = p_user_id;

  -- Delete associated data from public schema
  delete from public.profiles where id = p_user_id;
  -- Delete associated data from scheduled_emails table
  delete from public.scheduled_emails where user_id = p_user_id;
  -- Add any other tables that need to be cleaned up here
end;
$$ language plpgsql;

-- Grant execute permission to authenticated users
grant execute on function delete_user(p_user_id uuid) to authenticated;
