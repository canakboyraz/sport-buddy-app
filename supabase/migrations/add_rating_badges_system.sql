-- Add rating statistics to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS positive_reviews_count INTEGER DEFAULT 0;

-- Add sentiment tracking to ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS is_positive BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user_positive ON ratings(rated_user_id, is_positive);
CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON profiles(average_rating);

-- Function to update profile rating stats
CREATE OR REPLACE FUNCTION update_profile_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rated user's profile stats
  UPDATE profiles
  SET
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_user_id = NEW.rated_user_id
    ),
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM ratings
      WHERE rated_user_id = NEW.rated_user_id
    ),
    positive_reviews_count = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_user_id = NEW.rated_user_id
      AND is_positive = true
    )
  WHERE id = NEW.rated_user_id;

  -- Check and award achievements for the rated user
  PERFORM check_and_award_achievements(NEW.rated_user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stats update
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON ratings;
CREATE TRIGGER trigger_update_rating_stats
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating_stats();

-- Insert new rating-based badge achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points, color) VALUES
  -- Positive review badges
  ('İyi Başlangıç', '3 olumlu değerlendirme al', 'thumb-up-outline', 'ratings', 'positive_reviews', 3, 15, '#4CAF50'),
  ('Beğenilen', '10 olumlu değerlendirme al', 'heart', 'ratings', 'positive_reviews', 10, 35, '#E91E63'),
  ('Çok Beğenilen', '25 olumlu değerlendirme al', 'heart-multiple', 'ratings', 'positive_reviews', 25, 75, '#FF4081'),
  ('Efsane', '50 olumlu değerlendirme al', 'crown', 'ratings', 'positive_reviews', 50, 150, '#FFD700'),
  ('Süperstar', '100 olumlu değerlendirme al', 'diamond', 'ratings', 'positive_reviews', 100, 300, '#9C27B0'),

  -- Average rating badges
  ('Kaliteli Oyuncu', '4.5+ ortalama puana ulaş (min 5 değerlendirme)', 'star-face', 'ratings', 'high_rating', 1, 40, '#FFD700'),
  ('Mükemmel Sporcu', '4.8+ ortalama puana ulaş (min 10 değerlendirme)', 'trophy-award', 'ratings', 'excellent_rating', 1, 80, '#FFC107'),

  -- Total ratings badges (updated)
  ('Tanınan', '20 değerlendirme al', 'account-star', 'ratings', 'total_ratings', 20, 50, '#FF5722'),
  ('Ünlü', '50 değerlendirme al', 'star-box-multiple', 'ratings', 'total_ratings', 50, 120, '#FF9800')
ON CONFLICT DO NOTHING;

-- Enhanced function to check and award achievements including rating-based ones
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_sessions_created INTEGER;
  v_sessions_joined INTEGER;
  v_total_ratings INTEGER;
  v_five_star_ratings INTEGER;
  v_positive_reviews INTEGER;
  v_average_rating DECIMAL(3,2);
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

  SELECT COUNT(*) INTO v_positive_reviews
  FROM ratings WHERE rated_user_id = p_user_id AND is_positive = true;

  SELECT COALESCE(average_rating, 0) INTO v_average_rating
  FROM profiles WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_messages_sent
  FROM messages WHERE user_id = p_user_id;

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
      WHEN 'positive_reviews' THEN
        IF v_positive_reviews >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'high_rating' THEN
        IF v_average_rating >= 4.5 AND v_total_ratings >= 5 THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'excellent_rating' THEN
        IF v_average_rating >= 4.8 AND v_total_ratings >= 10 THEN
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

-- Backfill existing ratings data (calculate stats for existing users)
DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN SELECT id FROM profiles LOOP
    UPDATE profiles
    SET
      total_ratings = (
        SELECT COUNT(*)
        FROM ratings
        WHERE rated_user_id = v_profile.id
      ),
      average_rating = (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM ratings
        WHERE rated_user_id = v_profile.id
      ),
      positive_reviews_count = (
        SELECT COUNT(*)
        FROM ratings
        WHERE rated_user_id = v_profile.id
        AND (rating >= 4 OR is_positive = true)
      )
    WHERE id = v_profile.id;
  END LOOP;
END $$;

-- Add comments
COMMENT ON COLUMN profiles.average_rating IS 'User average rating from 0 to 5';
COMMENT ON COLUMN profiles.total_ratings IS 'Total number of ratings received';
COMMENT ON COLUMN profiles.positive_reviews_count IS 'Number of positive reviews (4+ stars or marked positive)';
COMMENT ON COLUMN ratings.is_positive IS 'Whether this is a positive review (useful for badge awards)';
