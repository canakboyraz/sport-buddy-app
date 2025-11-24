-- Manually update all user rating stats based on existing ratings
-- This is needed because the trigger might not have been in place when ratings were added

-- Update all profiles with their current rating statistics
UPDATE profiles
SET
  average_rating = COALESCE(
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = profiles.id),
    0
  ),
  total_ratings = COALESCE(
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = profiles.id),
    0
  ),
  positive_reviews_count = COALESCE(
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = profiles.id AND rating >= 4),
    0
  ),
  updated_at = NOW()
WHERE id IN (
  -- Only update profiles that have received ratings
  SELECT DISTINCT rated_user_id FROM ratings
);

-- Verify the update
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
WHERE p.total_ratings > 0
ORDER BY p.total_ratings DESC;
