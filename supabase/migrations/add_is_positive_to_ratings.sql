-- Add is_positive column to ratings table
-- This column tracks whether a rating is considered positive (4+ stars)

-- Add the column (nullable at first)
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS is_positive BOOLEAN;

-- Update existing rows: ratings >= 4 are considered positive
UPDATE ratings SET is_positive = (rating >= 4) WHERE is_positive IS NULL;

-- Make the column NOT NULL with a default value
ALTER TABLE ratings ALTER COLUMN is_positive SET DEFAULT true;
ALTER TABLE ratings ALTER COLUMN is_positive SET NOT NULL;

-- Create or replace the trigger function to automatically set is_positive
CREATE OR REPLACE FUNCTION set_rating_is_positive()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_positive := (NEW.rating >= 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_rating_is_positive ON ratings;

-- Create trigger to automatically set is_positive before insert or update
CREATE TRIGGER trigger_set_rating_is_positive
  BEFORE INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION set_rating_is_positive();

-- Update the update_user_rating_stats function to use is_positive
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
    COUNT(*) FILTER (WHERE is_positive = true)
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

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger for updating stats
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON ratings;
CREATE TRIGGER trigger_update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating_stats();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_ratings_is_positive ON ratings(is_positive);

COMMENT ON COLUMN ratings.is_positive IS 'Automatically set to true if rating >= 4, used for badge calculations';
