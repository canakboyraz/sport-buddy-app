-- Add rating-related columns to profiles table
-- This migration adds columns needed for the user rating and badge system

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_reviews_count INTEGER DEFAULT 0;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.average_rating IS 'Average rating from 0.00 to 5.00';
COMMENT ON COLUMN profiles.total_ratings IS 'Total number of ratings received';
COMMENT ON COLUMN profiles.positive_reviews_count IS 'Number of positive reviews (4 stars or higher)';

-- Create index for efficient queries on average_rating
CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON profiles(average_rating DESC);
