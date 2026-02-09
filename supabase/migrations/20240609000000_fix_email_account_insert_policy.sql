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
