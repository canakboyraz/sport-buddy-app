-- Verify and fix the rating stats update trigger

-- First, check if the trigger function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'update_user_rating_stats';

-- Drop and recreate the trigger function to ensure it's correct
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  avg_rating NUMERIC;
  total_count INTEGER;
  positive_count INTEGER;
BEGIN
  -- Determine which user's stats to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.rated_user_id;
  ELSE
    target_user_id := NEW.rated_user_id;
  END IF;

  -- Calculate stats
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating >= 4)
  INTO avg_rating, total_count, positive_count
  FROM ratings
  WHERE rated_user_id = target_user_id;

  -- Update profile
  UPDATE profiles
  SET
    average_rating = avg_rating,
    total_ratings = total_count,
    positive_reviews_count = positive_count,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Log the update for debugging
  RAISE NOTICE 'Updated stats for user %: avg=%, total=%, positive=%',
    target_user_id, avg_rating, total_count, positive_count;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON ratings;

-- Create trigger to run AFTER INSERT, UPDATE, or DELETE
CREATE TRIGGER trigger_update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_stats();

-- Verify the trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'ratings'
  AND trigger_name = 'trigger_update_rating_stats';

-- Test with a simple query
SELECT
  'Trigger verification complete' as status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_table = 'ratings'
  AND trigger_name = 'trigger_update_rating_stats';
