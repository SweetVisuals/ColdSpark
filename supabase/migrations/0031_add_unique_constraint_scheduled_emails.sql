-- Add unique constraint to prevent duplicate schedules
ALTER TABLE scheduled_emails
ADD CONSTRAINT unique_email_account_template
UNIQUE (email_account_id, template_id);
