-- Recalculate all existing rating statistics for all users
-- Run this once to fix existing data after the trigger is created

-- Update all profiles with correct rating statistics
UPDATE profiles p
SET
  total_ratings = (
    SELECT COUNT(*)
    FROM ratings r
    WHERE r.rated_user_id = p.id
  ),
  average_rating = (
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM ratings r
    WHERE r.rated_user_id = p.id
  ),
  positive_reviews_count = (
    SELECT COUNT(*)
    FROM ratings r
    WHERE r.rated_user_id = p.id
      AND r.is_positive = true
  ),
  updated_at = NOW()
WHERE p.id IN (
  -- Only update profiles that have received ratings
  SELECT DISTINCT rated_user_id
  FROM ratings
);

-- Show results
SELECT
  p.id,
  p.full_name,
  p.email,
  p.total_ratings,
  p.average_rating,
  p.positive_reviews_count,
  (SELECT COUNT(*) FROM ratings WHERE rated_user_id = p.id) as actual_ratings
FROM profiles p
WHERE p.total_ratings > 0 OR p.id IN (SELECT DISTINCT rated_user_id FROM ratings)
ORDER BY p.total_ratings DESC;
