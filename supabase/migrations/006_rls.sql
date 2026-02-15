ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_all" ON properties
  FOR SELECT USING (is_active = true);

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "analysis_requests_select_own" ON analysis_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analysis_requests_insert_auth" ON analysis_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analysis_reports_select_own" ON analysis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_requests
      WHERE analysis_requests.id = analysis_reports.request_id
      AND analysis_requests.user_id = auth.uid()
    )
  );
