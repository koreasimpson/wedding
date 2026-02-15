CREATE TABLE analysis_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_types TEXT[] NOT NULL DEFAULT '{market,location,investment,regulation,risk}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_analysis_requests_user ON analysis_requests (user_id, created_at DESC);
CREATE INDEX idx_analysis_requests_property ON analysis_requests (property_id);
CREATE INDEX idx_analysis_requests_status ON analysis_requests (status) WHERE status IN ('pending', 'processing');

CREATE TABLE analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES analysis_requests(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('market', 'location', 'investment', 'regulation', 'risk')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  confidence INTEGER DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (request_id, analysis_type)
);

CREATE INDEX idx_analysis_reports_property ON analysis_reports (property_id, analysis_type);
CREATE INDEX idx_analysis_reports_request ON analysis_reports (request_id);

CREATE OR REPLACE FUNCTION update_request_on_report()
RETURNS TRIGGER AS $$
DECLARE
  total INTEGER;
  completed INTEGER;
BEGIN
  SELECT total_count INTO total
  FROM analysis_requests WHERE id = NEW.request_id;

  SELECT COUNT(*) INTO completed
  FROM analysis_reports WHERE request_id = NEW.request_id;

  UPDATE analysis_requests
  SET
    completed_count = completed,
    status = CASE WHEN completed >= total THEN 'completed' ELSE 'processing' END,
    completed_at = CASE WHEN completed >= total THEN now() ELSE NULL END
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_report_created
  AFTER INSERT ON analysis_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_request_on_report();
