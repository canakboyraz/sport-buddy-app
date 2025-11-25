-- Debug and fix the rating trigger system

-- Step 1: Check if trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ratings';

-- Step 2: Check if function exists
SELECT
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'update_user_rating_stats';

-- Step 3: Drop and recreate everything to ensure it works
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON ratings;
DROP FUNCTION IF EXISTS update_user_rating_stats();

-- Step 4: Create the trigger function
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

  -- Calculate stats from ratings table
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating >= 4)
  INTO avg_rating, total_count, positive_count
  FROM ratings
  WHERE rated_user_id = target_user_id;

  -- Update profile with new stats
  UPDATE profiles
  SET
    average_rating = avg_rating,
    total_ratings = total_count,
    positive_reviews_count = positive_count,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Log for debugging
  RAISE NOTICE 'Updated stats for user %: avg=%, total=%, positive=%',
    target_user_id, avg_rating, total_count, positive_count;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger
CREATE TRIGGER trigger_update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_stats();

-- Step 6: Manually update all existing stats
UPDATE profiles p
SET
  average_rating = COALESCE(
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = p.id),
    0
  ),
  total_ratings = COALESCE(
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = p.id),
    0
  ),
  positive_reviews_count = COALESCE(
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = p.id AND rating >= 4),
    0
  ),
  updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM ratings WHERE rated_user_id = p.id);

-- Step 7: Verify the results
SELECT
  p.id,
  p.full_name,
  p.email,
  p.average_rating,
  p.total_ratings,
  p.positive_reviews_count,
  (SELECT COUNT(*) FROM ratings r WHERE r.rated_user_id = p.id) as actual_rating_count,
  (SELECT AVG(rating) FROM ratings r WHERE r.rated_user_id = p.id) as actual_avg_rating
FROM profiles p
WHERE p.total_ratings > 0 OR EXISTS (SELECT 1 FROM ratings r WHERE r.rated_user_id = p.id)
ORDER BY p.total_ratings DESC;

-- Step 8: Test the trigger with a dummy insert (will be rolled back)
-- DO $$
-- DECLARE
--   test_user_id UUID;
-- BEGIN
--   SELECT id INTO test_user_id FROM profiles LIMIT 1;
--
--   -- This should trigger the function
--   INSERT INTO ratings (session_id, rated_user_id, rater_user_id, rating, comment)
--   VALUES (1, test_user_id, test_user_id, 5, 'Test rating');
--
--   -- Check if stats were updated
--   RAISE NOTICE 'Test completed';
--
--   -- Rollback the test insert
--   RAISE EXCEPTION 'Rolling back test insert';
-- END $$;

COMMENT ON TRIGGER trigger_update_rating_stats ON ratings IS 'Automatically updates user rating statistics in profiles table';
