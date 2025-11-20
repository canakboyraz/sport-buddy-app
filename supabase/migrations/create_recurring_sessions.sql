-- Create recurring_sessions table for repeating events
CREATE TABLE IF NOT EXISTS recurring_sessions (
  id BIGSERIAL PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  start_time TIME NOT NULL, -- Time of day for the session (e.g., 18:00)
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER NOT NULL,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')) NOT NULL,
  recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_day INTEGER, -- For weekly: 0-6 (Sunday-Saturday), For monthly: 1-31 (day of month)
  start_date DATE NOT NULL,
  end_date DATE, -- Optional: when to stop creating sessions
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_creator ON recurring_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_sport ON recurring_sessions(sport_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_active ON recurring_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_type ON recurring_sessions(recurrence_type);

-- Enable RLS
ALTER TABLE recurring_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active recurring sessions
CREATE POLICY recurring_sessions_select_policy ON recurring_sessions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Users can create their own recurring sessions
CREATE POLICY recurring_sessions_insert_policy ON recurring_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own recurring sessions
CREATE POLICY recurring_sessions_update_policy ON recurring_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Users can delete their own recurring sessions
CREATE POLICY recurring_sessions_delete_policy ON recurring_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_sessions_updated_at
  BEFORE UPDATE ON recurring_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_sessions_updated_at();

-- Function to generate next session date for a recurring session
CREATE OR REPLACE FUNCTION get_next_session_date(
  p_recurring_id BIGINT,
  p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
  v_recurrence_type VARCHAR(20);
  v_recurrence_day INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_next_date DATE;
  v_current_date DATE;
BEGIN
  -- Get recurring session details
  SELECT recurrence_type, recurrence_day, start_date, end_date
  INTO v_recurrence_type, v_recurrence_day, v_start_date, v_end_date
  FROM recurring_sessions
  WHERE id = p_recurring_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_current_date := GREATEST(p_from_date, v_start_date);

  -- Calculate next date based on recurrence type
  CASE v_recurrence_type
    WHEN 'daily' THEN
      v_next_date := v_current_date + INTERVAL '1 day';

    WHEN 'weekly' THEN
      -- Find next occurrence of the specified day of week
      v_next_date := v_current_date + ((v_recurrence_day - EXTRACT(DOW FROM v_current_date)::INTEGER + 7) % 7) * INTERVAL '1 day';
      IF v_next_date <= v_current_date THEN
        v_next_date := v_next_date + INTERVAL '7 days';
      END IF;

    WHEN 'biweekly' THEN
      -- Find next occurrence of the specified day of week, every 2 weeks
      v_next_date := v_current_date + ((v_recurrence_day - EXTRACT(DOW FROM v_current_date)::INTEGER + 7) % 7) * INTERVAL '1 day';
      IF v_next_date <= v_current_date THEN
        v_next_date := v_next_date + INTERVAL '14 days';
      END IF;

    WHEN 'monthly' THEN
      -- Next occurrence of the specified day of month
      v_next_date := DATE_TRUNC('month', v_current_date) + (v_recurrence_day - 1) * INTERVAL '1 day';
      IF v_next_date <= v_current_date THEN
        v_next_date := DATE_TRUNC('month', v_current_date + INTERVAL '1 month') + (v_recurrence_day - 1) * INTERVAL '1 day';
      END IF;
  END CASE;

  -- Check if end_date is set and next_date exceeds it
  IF v_end_date IS NOT NULL AND v_next_date > v_end_date THEN
    RETURN NULL;
  END IF;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create sport_session from recurring_session
CREATE OR REPLACE FUNCTION create_session_from_recurring(
  p_recurring_id BIGINT,
  p_session_date DATE
)
RETURNS BIGINT AS $$
DECLARE
  v_recurring RECORD;
  v_session_datetime TIMESTAMP WITH TIME ZONE;
  v_session_id BIGINT;
BEGIN
  -- Get recurring session details
  SELECT * INTO v_recurring
  FROM recurring_sessions
  WHERE id = p_recurring_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring session not found or inactive';
  END IF;

  -- Combine date and time
  v_session_datetime := p_session_date + v_recurring.start_time;

  -- Check if session already exists for this date
  IF EXISTS (
    SELECT 1 FROM sport_sessions
    WHERE recurring_session_id = p_recurring_id
    AND DATE(session_date) = p_session_date
  ) THEN
    RAISE EXCEPTION 'Session already exists for this date';
  END IF;

  -- Create new sport_session
  INSERT INTO sport_sessions (
    creator_id,
    sport_id,
    title,
    description,
    location,
    city,
    latitude,
    longitude,
    session_date,
    max_participants,
    skill_level,
    recurring_session_id
  )
  VALUES (
    v_recurring.creator_id,
    v_recurring.sport_id,
    v_recurring.title,
    v_recurring.description,
    v_recurring.location,
    v_recurring.city,
    v_recurring.latitude,
    v_recurring.longitude,
    v_session_datetime,
    v_recurring.max_participants,
    v_recurring.skill_level,
    p_recurring_id
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate upcoming sessions from recurring session
CREATE OR REPLACE FUNCTION generate_recurring_sessions(
  p_recurring_id BIGINT,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (session_id BIGINT, session_date DATE) AS $$
DECLARE
  v_next_date DATE;
  v_end_date DATE;
  v_generated_id BIGINT;
BEGIN
  v_end_date := CURRENT_DATE + p_days_ahead;
  v_next_date := get_next_session_date(p_recurring_id, CURRENT_DATE);

  WHILE v_next_date IS NOT NULL AND v_next_date <= v_end_date LOOP
    BEGIN
      v_generated_id := create_session_from_recurring(p_recurring_id, v_next_date);
      session_id := v_generated_id;
      session_date := v_next_date;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if session already exists or other error
      NULL;
    END;

    v_next_date := get_next_session_date(p_recurring_id, v_next_date);
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add recurring_session_id column to sport_sessions
ALTER TABLE sport_sessions
ADD COLUMN IF NOT EXISTS recurring_session_id BIGINT REFERENCES recurring_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sport_sessions_recurring ON sport_sessions(recurring_session_id);

-- Add comments
COMMENT ON TABLE recurring_sessions IS 'Template for recurring sport sessions';
COMMENT ON COLUMN recurring_sessions.recurrence_type IS 'Type of recurrence: daily, weekly, biweekly, monthly';
COMMENT ON COLUMN recurring_sessions.recurrence_day IS 'Day of week (0-6) for weekly/biweekly, day of month (1-31) for monthly';
COMMENT ON FUNCTION get_next_session_date IS 'Calculate next occurrence date for a recurring session';
COMMENT ON FUNCTION create_session_from_recurring IS 'Create a sport_session from a recurring_session template';
COMMENT ON FUNCTION generate_recurring_sessions IS 'Generate upcoming sessions for a recurring session';
