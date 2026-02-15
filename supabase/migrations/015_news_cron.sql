-- Add pg_cron schedule for news crawling
-- Requires pg_cron extension (Supabase Pro plan)

-- Schedule daily news crawling at 09:00 KST (00:00 UTC)
-- SELECT cron.schedule(
--   'crawl-property-news',
--   '0 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/crawl-news',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Add index on property_news for efficient queries
CREATE INDEX IF NOT EXISTS idx_property_news_property_id ON property_news(property_id);
CREATE INDEX IF NOT EXISTS idx_property_news_published_at ON property_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_news_url ON property_news(url);

-- Add unique constraint on url to prevent duplicates
ALTER TABLE property_news ADD CONSTRAINT IF NOT EXISTS unique_news_url UNIQUE (url);

-- Note: Uncomment the cron.schedule when pg_cron extension is available (Supabase Pro plan)
