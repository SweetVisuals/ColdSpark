-- Create auth.uid() function
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    nullif(
      current_setting('request.jwt.claim.sub', true),
      ''
    )::uuid
$$;
