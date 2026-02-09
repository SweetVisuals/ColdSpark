-- Add RLS policy for creating email accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'email_accounts'
    AND policyname = 'Allow users to create their own email accounts'
  ) THEN
    CREATE POLICY "Allow users to create their own email accounts"
    ON public.email_accounts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
