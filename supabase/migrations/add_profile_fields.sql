-- Add additional profile fields for enhanced user profiles
-- This migration adds city and favorite_sports columns to the profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS favorite_sports TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create an index on city for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function before any update on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to describe the new columns
COMMENT ON COLUMN profiles.city IS 'User''s city location';
COMMENT ON COLUMN profiles.favorite_sports IS 'Comma-separated list of user''s favorite sports';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp of last profile update';
