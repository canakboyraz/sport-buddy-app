-- Favoriler tablosu
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES sport_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_session_id ON favorites(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- RLS (Row Level Security) politikaları
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi favorilerini görebilir
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi favorilerini ekleyebilir
CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi favorilerini silebilir
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Kayıtlı/Saved etkinlikler tablosu
CREATE TABLE IF NOT EXISTS saved_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES sport_sessions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_saved_sessions_user_id ON saved_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_session_id ON saved_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_created_at ON saved_sessions(created_at DESC);

-- RLS politikaları
ALTER TABLE saved_sessions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi kayıtlı seanslarını görebilir
CREATE POLICY "Users can view own saved sessions"
  ON saved_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi kayıtlı seanslarını ekleyebilir
CREATE POLICY "Users can insert own saved sessions"
  ON saved_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi kayıtlı seanslarını güncelleyebilir
CREATE POLICY "Users can update own saved sessions"
  ON saved_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi kayıtlı seanslarını silebilir
CREATE POLICY "Users can delete own saved sessions"
  ON saved_sessions FOR DELETE
  USING (auth.uid() = user_id);
