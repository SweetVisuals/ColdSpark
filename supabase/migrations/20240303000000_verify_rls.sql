-- Verify RLS on all user-specific tables
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('campaigns', 'email_accounts', 'campaign_email_accounts', 'leads', 'scheduled_emails')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = tbl_name
      AND n.nspname = 'public'
      AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS not enabled on table %', tbl_name;
    END IF;
  END LOOP;
END $$;

-- Verify user_id columns
DO $$
DECLARE
  current_table text;
BEGIN
  FOR current_table IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('campaigns', 'email_accounts', 'leads', 'scheduled_emails')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns cols
      WHERE cols.table_name = current_table
      AND cols.column_name = 'user_id'
    ) THEN
      RAISE EXCEPTION 'user_id column not found in table %', current_table;
    END IF;
  END LOOP;
END $$;
