-- Modify user_id column to be NOT NULL with default auth.uid()
ALTER TABLE public.email_accounts
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();
