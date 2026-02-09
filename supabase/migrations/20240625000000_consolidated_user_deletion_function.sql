-- Drop existing function if it exists
drop function if exists public.delete_user(uuid);

-- Create consolidated user deletion function
create function public.delete_user(p_user_id uuid)
returns json as $$
declare
  deleted_count integer;
begin
  -- Verify user exists
  if not exists (select 1 from auth.users where id = p_user_id) then
    return json_build_object('error', 'User not found');
  end if;

  -- Delete user data from all related tables
  delete from public.user_profiles where user_id = p_user_id;
  delete from public.email_accounts where user_id = p_user_id;
  delete from public.campaigns where user_id = p_user_id;
  delete from public.leads where user_id = p_user_id;

  -- Delete the auth user
  delete from auth.users where id = p_user_id;

  -- Return success
  return json_build_object('success', true);
exception
  when others then
    return json_build_object('error', sqlerrm);
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.delete_user(uuid) to authenticated;

-- Add function to supabase_functions schema
comment on function public.delete_user is 'Deletes a user and all related data';
