-- Achievement System Database Schema
-- This file contains all SQL needed to set up the achievement/badge system

-- 1. Create achievements table (defines all possible achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- Unique identifier for the achievement (e.g., 'first_session', 'social_butterfly')
  name VARCHAR(100) NOT NULL, -- Display name (e.g., 'İlk Seans')
  description TEXT NOT NULL, -- Description shown to users
  icon VARCHAR(50) NOT NULL, -- MaterialCommunityIcons icon name
  category VARCHAR(50) NOT NULL, -- Category: 'participation', 'social', 'creation', 'special'
  points INTEGER DEFAULT 0, -- Points awarded for unlocking
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_achievements table (tracks which users have which achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 100, -- For progressive achievements (0-100)
  UNIQUE(user_id, achievement_id) -- A user can only unlock each achievement once
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for achievements table
-- Everyone can view all achievements
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

-- Only admins can insert/update/delete achievements (for now, block all writes)
CREATE POLICY "No public writes to achievements"
  ON achievements FOR ALL
  USING (false);

-- 6. RLS Policies for user_achievements table
-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view others' achievements (for profile pages)
CREATE POLICY "Anyone can view user achievements"
  ON user_achievements FOR SELECT
  USING (true);

-- Only the system/backend can insert achievements (via service role)
-- For now, we'll allow authenticated users to insert their own
CREATE POLICY "System can insert user achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No updates or deletes (achievements are permanent)
CREATE POLICY "No updates to user achievements"
  ON user_achievements FOR UPDATE
  USING (false);

CREATE POLICY "No deletes to user achievements"
  ON user_achievements FOR DELETE
  USING (false);

-- 7. Insert initial achievements
INSERT INTO achievements (code, name, description, icon, category, points, rarity) VALUES
  -- Participation achievements
  ('first_session', 'İlk Adım', 'İlk spor seansına katıldın!', 'star', 'participation', 10, 'common'),
  ('session_5', 'Aktif Sporcu', '5 farklı spor seansına katıldın', 'star-circle', 'participation', 25, 'common'),
  ('session_10', 'Spor Tutkunu', '10 farklı spor seansına katıldın', 'star-circle-outline', 'participation', 50, 'rare'),
  ('session_25', 'Veteran', '25 farklı spor seansına katıldın', 'trophy', 'participation', 100, 'epic'),
  ('session_50', 'Efsane', '50 farklı spor seansına katıldın', 'trophy-award', 'participation', 250, 'legendary'),

  -- Creation achievements
  ('first_create', 'Organizatör', 'İlk spor seansını oluşturdun!', 'calendar-plus', 'creation', 15, 'common'),
  ('create_5', 'Deneyimli Organizatör', '5 spor seansı oluşturdun', 'calendar-check', 'creation', 35, 'rare'),
  ('create_10', 'Topluluk Lideri', '10 spor seansı oluşturdun', 'account-star', 'creation', 75, 'epic'),

  -- Social achievements
  ('friend_5', 'Sosyal', '5 farklı kullanıcıyla seans yaptın', 'account-group', 'social', 20, 'common'),
  ('friend_10', 'Sosyal Kelebek', '10 farklı kullanıcıyla seans yaptın', 'account-multiple', 'social', 50, 'rare'),
  ('friend_25', 'Herkesin Arkadaşı', '25 farklı kullanıcıyla seans yaptın', 'account-heart', 'social', 100, 'epic'),

  -- Rating achievements
  ('rating_high', 'Sevilen Sporcu', 'Ortalama 4.5+ yıldız aldın (min 5 değerlendirme)', 'star-face', 'social', 50, 'rare'),
  ('rating_perfect', 'Mükemmel', '10 adet 5 yıldız aldın', 'star-box-multiple', 'social', 100, 'epic'),

  -- Sports variety achievements
  ('sports_3', 'Çok Yönlü', '3 farklı spor dalında seans yaptın', 'trophy-variant', 'participation', 30, 'rare'),
  ('sports_5', 'Sporların Hepsi', '5 farklı spor dalında seans yaptın', 'trophy-variant-plus', 'participation', 75, 'epic'),

  -- Special achievements
  ('early_bird', 'Erken Kalkan', 'Sabah 7:00 öncesi bir seansa katıldın', 'weather-sunset-up', 'special', 20, 'rare'),
  ('night_owl', 'Gece Kuşu', 'Gece 21:00 sonrası bir seansa katıldın', 'weather-night', 'special', 20, 'rare'),
  ('weekend_warrior', 'Hafta Sonu Savaşçısı', '5 hafta sonu seansına katıldın', 'calendar-weekend', 'special', 40, 'rare')
ON CONFLICT (code) DO NOTHING;

-- 8. Create function to check and award achievements
-- This function can be called after session participation or creation
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(new_achievements UUID[]) AS $$
DECLARE
  v_session_count INTEGER;
  v_created_count INTEGER;
  v_unique_users INTEGER;
  v_unique_sports INTEGER;
  v_avg_rating NUMERIC;
  v_five_star_count INTEGER;
  v_achievements UUID[];
BEGIN
  -- Get user statistics
  SELECT COUNT(DISTINCT sp.session_id)
  INTO v_session_count
  FROM session_participants sp
  WHERE sp.user_id = p_user_id AND sp.status = 'confirmed';

  SELECT COUNT(*)
  INTO v_created_count
  FROM sport_sessions ss
  WHERE ss.creator_id = p_user_id;

  SELECT COUNT(DISTINCT sp2.user_id)
  INTO v_unique_users
  FROM session_participants sp1
  JOIN session_participants sp2 ON sp1.session_id = sp2.session_id
  WHERE sp1.user_id = p_user_id AND sp2.user_id != p_user_id
    AND sp1.status = 'confirmed' AND sp2.status = 'confirmed';

  SELECT COUNT(DISTINCT ss.sport_id)
  INTO v_unique_sports
  FROM session_participants sp
  JOIN sport_sessions ss ON sp.session_id = ss.id
  WHERE sp.user_id = p_user_id AND sp.status = 'confirmed';

  SELECT AVG(rating), COUNT(*) FILTER (WHERE rating = 5)
  INTO v_avg_rating, v_five_star_count
  FROM user_ratings
  WHERE rated_user_id = p_user_id;

  v_achievements := ARRAY[]::UUID[];

  -- Check and award participation achievements
  IF v_session_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'first_session'
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id INTO v_achievements;
  END IF;

  IF v_session_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'session_5'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_session_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'session_10'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_session_count >= 25 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'session_25'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_session_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'session_50'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check creation achievements
  IF v_created_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'first_create'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_created_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'create_5'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_created_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'create_10'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check social achievements
  IF v_unique_users >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'friend_5'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_unique_users >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'friend_10'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_unique_users >= 25 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'friend_25'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check sports variety
  IF v_unique_sports >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'sports_3'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_unique_sports >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'sports_5'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check rating achievements
  IF v_avg_rating >= 4.5 AND v_session_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'rating_high'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_five_star_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT p_user_id, id FROM achievements WHERE code = 'rating_perfect'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Return newly awarded achievements
  RETURN QUERY
  SELECT ARRAY_AGG(achievement_id)
  FROM user_achievements
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to auto-check achievements after session participation
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue achievement check (can be done async)
  PERFORM check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on session participation
CREATE TRIGGER after_session_participation
  AFTER INSERT ON session_participants
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION trigger_check_achievements();

-- Trigger on session creation
CREATE TRIGGER after_session_creation
  AFTER INSERT ON sport_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();
