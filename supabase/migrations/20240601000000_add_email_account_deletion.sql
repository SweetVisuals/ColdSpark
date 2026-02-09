-- Add email account deletion to user deletion function
create or replace function delete_user()
returns void
security definer
as $$
declare
  user_id uuid;
begin
  -- Get the current authenticated user's ID
  user_id := auth.uid();

  -- Delete associated email accounts
  delete from public.email_accounts where user_id = user_id;
  
  -- Delete user from auth schema
  delete from auth.users where id = user_id;

  -- Delete associated data from public schema
  delete from public.profiles where id = user_id;
end;
$$ language plpgsql;

-- Verify RLS policy for email_accounts deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'email_accounts'
    AND policyname = 'Allow users to delete their own email accounts'
  ) THEN
    CREATE POLICY "Allow users to delete their own email accounts"
    ON public.email_accounts
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;
