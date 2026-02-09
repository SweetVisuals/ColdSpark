-- Check if email_account_id column exists before attempting migration
DO $$
DECLARE
  schedule_record RECORD;
  column_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scheduled_emails' 
    AND column_name = 'email_account_id'
  ) INTO column_exists;

  IF column_exists THEN
    -- Migrate existing email_account_id values to schedule_email_accounts
    FOR schedule_record IN
      SELECT id, email_account_id 
      FROM scheduled_emails 
      WHERE email_account_id IS NOT NULL
    LOOP
      -- Insert into new schedule_email_accounts table
      INSERT INTO schedule_email_accounts (
        schedule_id, 
        email_account_id,
        emails_sent,
        emails_remaining
      )
      VALUES (
        schedule_record.id,
        schedule_record.email_account_id,
        0, -- emails_sent
        (SELECT emails_per_account FROM scheduled_emails WHERE id = schedule_record.id)
      );
    END LOOP;

    -- Verify migration
    IF EXISTS (
      SELECT 1 
      FROM scheduled_emails 
      WHERE email_account_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Migration failed - some scheduled emails still have email_account_id';
    END IF;
  ELSE
    RAISE NOTICE 'email_account_id column already migrated - no action needed';
  END IF;
END $$;
