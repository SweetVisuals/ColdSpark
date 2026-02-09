-- Add debug function to verify auth.uid()
CREATE OR REPLACE FUNCTION debug_auth_uid() RETURNS uuid AS $$
DECLARE
  current_uid uuid;
BEGIN
  current_uid := auth.uid();
  RAISE NOTICE 'Current auth.uid(): %', current_uid::text;
  RETURN current_uid;
END;
$$ LANGUAGE plpgsql;

-- Update insert policy to use debug function
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow users to create their own email accounts" ON public.email_accounts;
  
  CREATE POLICY "Allow users to create their own email accounts"
  ON public.email_accounts
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL AND
    user_id = debug_auth_uid()
  );
END $$;
