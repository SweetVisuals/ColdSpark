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
