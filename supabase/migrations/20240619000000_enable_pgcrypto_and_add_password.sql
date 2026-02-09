-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted password column to email_accounts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_accounts' 
    AND column_name = 'encrypted_password'
  ) THEN
    ALTER TABLE email_accounts
    ADD COLUMN encrypted_password TEXT;
  END IF;
END $$;

-- Create function to encrypt password
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, encrypted_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN encrypted_password = crypt(password, encrypted_password);
END;
$$ LANGUAGE plpgsql;
