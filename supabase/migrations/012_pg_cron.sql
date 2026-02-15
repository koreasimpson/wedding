-- pg_cron extension (requires Supabase Pro plan)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily apt trade collection at 06:00 KST (21:00 UTC)
-- SELECT cron.schedule('collect-apt-trade-daily', '0 21 * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/collect-apt-trade',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
-- $$);

-- Weekly cleanup of inactive properties
-- SELECT cron.schedule('cleanup-inactive-properties', '0 18 * * 0', $$
--   UPDATE properties SET is_active = false WHERE updated_at < now() - INTERVAL '30 days' AND is_active = true;
-- $$);

-- Monthly cleanup of old collection logs
-- SELECT cron.schedule('cleanup-collection-logs', '0 0 1 * *', $$
--   DELETE FROM collection_logs WHERE created_at < now() - INTERVAL '90 days';
-- $$);

-- Note: Uncomment the above when pg_cron extension is available (Supabase Pro plan)
