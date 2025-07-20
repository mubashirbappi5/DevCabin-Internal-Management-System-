-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to automatically mark absent members after 11 PM daily
SELECT cron.schedule(
  'auto-mark-absent-daily',
  '5 23 * * *', -- Run at 11:05 PM every day (5 minutes after the cutoff)
  $$
  SELECT public.auto_mark_absent_members();
  $$
);