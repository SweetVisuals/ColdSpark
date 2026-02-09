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
