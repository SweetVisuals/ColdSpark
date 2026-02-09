-- Verify and fix RLS policies for email_accounts table
DO $$
BEGIN
  -- Enable RLS if not already enabled
  PERFORM 1 FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'email_accounts'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true;
  
  IF NOT FOUND THEN
    ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Drop existing insert policy if it exists
  DROP POLICY IF EXISTS "Allow users to create their own email accounts" ON public.email_accounts;
  
  -- Create insert policy with explicit check
  CREATE POLICY "Allow users to create their own email accounts"
  ON public.email_accounts
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL AND
    user_id = auth.uid()
  );

  -- Drop existing delete policy if it exists
  DROP POLICY IF EXISTS "Allow users to delete their own email accounts" ON public.email_accounts;
  
  -- Create delete policy with explicit check
  CREATE POLICY "Allow users to delete their own email accounts"
  ON public.email_accounts
  FOR DELETE
  USING (
    user_id IS NOT NULL AND
    user_id = auth.uid()
  );
END $$;
