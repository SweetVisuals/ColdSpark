ALTER TABLE campaign_progress
ADD COLUMN selected BOOLEAN DEFAULT FALSE;
-- Add emails_per_account column to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN emails_per_account integer NOT NULL DEFAULT 0;
-- Add missing warmup settings columns to email_accounts table
DO $$
BEGIN
    -- Add warmup_filter_tag if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_accounts' 
        AND column_name = 'warmup_filter_tag'
    ) THEN
        ALTER TABLE email_accounts
        ADD COLUMN warmup_filter_tag TEXT;
    END IF;

    -- Add warmup_increase_per_day if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_accounts' 
        AND column_name = 'warmup_increase_per_day'
    ) THEN
        ALTER TABLE email_accounts
        ADD COLUMN warmup_increase_per_day INTEGER DEFAULT 5;
    END IF;

    -- Add warmup_daily_limit if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_accounts' 
        AND column_name = 'warmup_daily_limit'
    ) THEN
        ALTER TABLE email_accounts
        ADD COLUMN warmup_daily_limit INTEGER DEFAULT 20;
    END IF;

    -- Add warmup_start_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_accounts' 
        AND column_name = 'warmup_start_date'
    ) THEN
        ALTER TABLE email_accounts
        ADD COLUMN warmup_start_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add warmup_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_accounts' 
        AND column_name = 'warmup_status'
    ) THEN
        ALTER TABLE email_accounts
        ADD COLUMN warmup_status TEXT DEFAULT 'disabled' 
        CHECK (warmup_status IN ('disabled', 'enabled', 'paused'));
    END IF;
END $$;
-- Create a function to handle user deletion
create or replace function delete_user(p_user_id uuid)
returns void
security definer
as $$
begin
  -- Verify the user exists
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0001';
  end if;

  -- Delete user from auth schema
  delete from auth.users where id = p_user_id;

  -- Delete associated data from public schema
  delete from public.profiles where id = p_user_id;
  -- Delete associated data from scheduled_emails table
  delete from public.scheduled_emails where user_id = p_user_id;
  -- Add any other tables that need to be cleaned up here
end;
$$ language plpgsql;

-- Grant execute permission to authenticated users
grant execute on function delete_user(p_user_id uuid) to authenticated;
