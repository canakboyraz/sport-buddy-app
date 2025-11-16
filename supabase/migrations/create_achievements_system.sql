-- Create achievements (badge definitions) table
CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'sessions', 'social', 'ratings', 'activity'
  requirement_type VARCHAR(50) NOT NULL, -- 'session_count', 'rating_count', 'friend_count', etc.
  requirement_value INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  color VARCHAR(20) DEFAULT '#6200ee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements (earned badges) table
CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_points table to track total points
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read)
CREATE POLICY achievements_select_policy ON achievements
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY user_achievements_select_policy ON user_achievements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY user_achievements_insert_policy ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_points
CREATE POLICY user_points_select_policy ON user_points
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY user_points_insert_policy ON user_points
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_points_update_policy ON user_points
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to calculate user level from points
CREATE OR REPLACE FUNCTION calculate_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level formula: level = floor(sqrt(points / 100)) + 1
  RETURN FLOOR(SQRT(points::float / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award achievement and update points
CREATE OR REPLACE FUNCTION award_achievement(p_user_id UUID, p_achievement_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_points INTEGER;
  v_exists BOOLEAN;
BEGIN
  -- Check if user already has this achievement
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN FALSE;
  END IF;

  -- Get achievement points
  SELECT points INTO v_points FROM achievements WHERE id = p_achievement_id;

  -- Award achievement
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id);

  -- Update user points
  INSERT INTO user_points (user_id, total_points, level)
  VALUES (p_user_id, v_points, calculate_level(v_points))
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = user_points.total_points + v_points,
    level = calculate_level(user_points.total_points + v_points),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points, color) VALUES
  -- Session achievements
  ('İlk Adım', 'İlk seansını oluştur', 'flag', 'sessions', 'sessions_created', 1, 10, '#4CAF50'),
  ('Organizatör', '5 seans oluştur', 'star', 'sessions', 'sessions_created', 5, 25, '#FF9800'),
  ('Etkinlik Ustası', '10 seans oluştur', 'trophy', 'sessions', 'sessions_created', 10, 50, '#FFD700'),
  ('Katılımcı', '5 seansa katıl', 'account-group', 'sessions', 'sessions_joined', 5, 25, '#2196F3'),
  ('Sosyal Kelebek', '20 seansa katıl', 'account-multiple', 'sessions', 'sessions_joined', 20, 100, '#9C27B0'),

  -- Rating achievements
  ('Güvenilir', '5 yıldızlı değerlendirme al', 'star-circle', 'ratings', 'five_star_ratings', 1, 20, '#FFD700'),
  ('Popüler', '10 değerlendirme al', 'thumb-up', 'ratings', 'total_ratings', 10, 30, '#FF5722'),

  -- Activity achievements
  ('Konuşkan', '50 mesaj gönder', 'message', 'activity', 'messages_sent', 50, 20, '#00BCD4'),
  ('Sohbet Kralı', '200 mesaj gönder', 'chat', 'activity', 'messages_sent', 200, 75, '#3F51B5'),

  -- Time achievements
  ('Sadık Kullanıcı', '30 gün üye ol', 'calendar-check', 'activity', 'days_member', 30, 40, '#607D8B'),
  ('Veteran', '90 gün üye ol', 'shield-account', 'activity', 'days_member', 90, 100, '#795548')
ON CONFLICT DO NOTHING;

-- Function to check and award achievements for a user
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_sessions_created INTEGER;
  v_sessions_joined INTEGER;
  v_total_ratings INTEGER;
  v_five_star_ratings INTEGER;
  v_messages_sent INTEGER;
  v_days_member INTEGER;
  v_achievement RECORD;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO v_sessions_created
  FROM sport_sessions WHERE creator_id = p_user_id;

  SELECT COUNT(*) INTO v_sessions_joined
  FROM session_participants WHERE user_id = p_user_id AND status = 'approved';

  SELECT COUNT(*) INTO v_total_ratings
  FROM ratings WHERE rated_user_id = p_user_id;

  SELECT COUNT(*) INTO v_five_star_ratings
  FROM ratings WHERE rated_user_id = p_user_id AND rating = 5;

  SELECT COUNT(*) INTO v_messages_sent
  FROM chat_messages WHERE user_id = p_user_id;

  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_days_member
  FROM profiles WHERE id = p_user_id;

  -- Check each achievement
  FOR v_achievement IN
    SELECT * FROM achievements
  LOOP
    CASE v_achievement.requirement_type
      WHEN 'sessions_created' THEN
        IF v_sessions_created >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'sessions_joined' THEN
        IF v_sessions_joined >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'total_ratings' THEN
        IF v_total_ratings >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'five_star_ratings' THEN
        IF v_five_star_ratings >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'messages_sent' THEN
        IF v_messages_sent >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'days_member' THEN
        IF v_days_member >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE achievements IS 'Badge/achievement definitions';
COMMENT ON TABLE user_achievements IS 'User earned achievements';
COMMENT ON TABLE user_points IS 'User points and level tracking';
