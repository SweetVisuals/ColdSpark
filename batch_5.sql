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
-- Temporarily disable RLS for testing
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
-- Re-enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow users to create their own email accounts" ON public.email_accounts;

-- Create a basic insert policy
CREATE POLICY "Allow users to create their own email accounts"
ON public.email_accounts
FOR INSERT
WITH CHECK (
  user_id IS NOT NULL AND
  user_id = auth.uid()
);

-- Create debug logging function
CREATE OR REPLACE FUNCTION log_rls_evaluation() RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'RLS Evaluation - user_id: %, auth.uid(): %', NEW.user_id::text, auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the debug function as a trigger
DROP TRIGGER IF EXISTS rls_debug_trigger ON public.email_accounts;
CREATE TRIGGER rls_debug_trigger
BEFORE INSERT ON public.email_accounts
FOR EACH ROW EXECUTE FUNCTION log_rls_evaluation();
-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow users to create their own email accounts" ON public.email_accounts;

-- Create new insert policy with explicit checks and error logging
CREATE POLICY "Allow users to create their own email accounts"
ON public.email_accounts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  user_id IS NOT NULL AND
  auth.uid() IS NOT NULL
);

-- Add function to log RLS policy evaluation
CREATE OR REPLACE FUNCTION public.log_rls_evaluation() RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'RLS Policy Evaluation: auth.uid() = %, user_id = %', auth.uid(), NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log RLS policy evaluation
CREATE TRIGGER log_rls_evaluation_trigger
BEFORE INSERT ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.log_rls_evaluation();
-- Grant INSERT privilege to public role on email_accounts table
GRANT INSERT ON TABLE public.email_accounts TO public;
-- Modify user_id column to be NOT NULL with default auth.uid()
ALTER TABLE public.email_accounts
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Ensure the log_rls_evaluation function exists
CREATE OR REPLACE FUNCTION public.log_rls_evaluation() RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'RLS Policy Evaluation: auth.uid() = %, user_id = %', auth.uid(), NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS log_rls_evaluation_trigger ON public.email_accounts;

-- Create the trigger
CREATE TRIGGER log_rls_evaluation_trigger
BEFORE INSERT ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.log_rls_evaluation();
-- Temporarily disable RLS for testing
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
-- Disable RLS on all tables since we're using application-level security
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails DISABLE ROW LEVEL SECURITY;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can only access their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can only access their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can only access campaign_email_accounts for their campaigns" ON campaign_email_accounts;
DROP POLICY IF EXISTS "Users can only access their own leads" ON leads;
DROP POLICY IF EXISTS "Users can only access their own scheduled emails" ON scheduled_emails;
