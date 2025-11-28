-- Fix rating stats trigger to handle UPDATE and DELETE as well
-- This ensures profile rating stats are always up-to-date

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON ratings;

-- Updated function to handle INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION update_profile_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Determine which user's stats need updating
  IF (TG_OP = 'DELETE') THEN
    target_user_id := OLD.rated_user_id;
  ELSE
    target_user_id := NEW.rated_user_id;
  END IF;

  -- Update the rated user's profile stats
  UPDATE profiles
  SET
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_user_id = target_user_id
    ),
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM ratings
      WHERE rated_user_id = target_user_id
    ),
    positive_reviews_count = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_user_id = target_user_id
        AND is_positive = true
    ),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Check and award achievements for the rated user
  IF (TG_OP = 'DELETE') THEN
    PERFORM check_and_award_achievements(target_user_id);
    RETURN OLD;
  ELSE
    PERFORM check_and_award_achievements(target_user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER trigger_update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating_stats();

-- Comment
COMMENT ON TRIGGER trigger_update_rating_stats ON ratings IS 'Automatically updates profile rating statistics when ratings are added, updated, or deleted';
