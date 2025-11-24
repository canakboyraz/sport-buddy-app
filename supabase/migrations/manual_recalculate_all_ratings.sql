-- Manually recalculate all rating statistics for all users
-- Run this to fix any inconsistencies in rating counts

DO $$
DECLARE
    profile_record RECORD;
    avg_rating NUMERIC;
    total_count INTEGER;
    positive_count INTEGER;
BEGIN
    -- Loop through all profiles
    FOR profile_record IN SELECT id FROM profiles
    LOOP
        -- Calculate stats for this user
        SELECT
            COALESCE(AVG(rating), 0),
            COUNT(*),
            COUNT(*) FILTER (WHERE rating >= 4)
        INTO avg_rating, total_count, positive_count
        FROM ratings
        WHERE rated_user_id = profile_record.id;

        -- Update profile with calculated stats
        UPDATE profiles
        SET
            average_rating = avg_rating,
            total_ratings = total_count,
            positive_reviews_count = positive_count,
            updated_at = NOW()
        WHERE id = profile_record.id;

        RAISE NOTICE 'Updated profile %: avg=%, total=%, positive=%',
            profile_record.id, avg_rating, total_count, positive_count;
    END LOOP;
END $$;

-- Verify the results
SELECT
    p.id,
    p.full_name,
    p.email,
    p.average_rating,
    p.total_ratings,
    p.positive_reviews_count,
    (SELECT COUNT(*) FROM ratings r WHERE r.rated_user_id = p.id) as actual_count,
    (SELECT AVG(rating) FROM ratings r WHERE r.rated_user_id = p.id) as actual_avg
FROM profiles p
WHERE p.total_ratings > 0 OR EXISTS (SELECT 1 FROM ratings r WHERE r.rated_user_id = p.id)
ORDER BY p.total_ratings DESC;
