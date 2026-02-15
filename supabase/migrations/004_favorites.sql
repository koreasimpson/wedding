CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);
