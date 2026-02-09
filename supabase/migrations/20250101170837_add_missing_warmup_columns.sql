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
