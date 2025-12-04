-- Fix for "CASE statement is missing ELSE part" error in check_and_award_achievements
-- This ensures that unknown achievement types don't cause the function to fail

CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_sessions_created INTEGER;
  v_sessions_joined INTEGER;
  v_total_ratings INTEGER;
  v_five_star_ratings INTEGER;
  v_positive_reviews INTEGER;
  v_average_rating DECIMAL(3,2);
  v_messages_sent INTEGER;
  v_days_member INTEGER;
  v_achievement RECORD;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO v_sessions_created
  FROM sport_sessions WHERE creator_id = p_user_id;

  SELECT COUNT(*) INTO v_sessions_joined
  FROM session_participants WHERE user_id = p_user_id AND status = 'approved';

  SELECT COUNT(*) INTO v_total_ratings
  FROM ratings WHERE rated_user_id = p_user_id;

  SELECT COUNT(*) INTO v_five_star_ratings
  FROM ratings WHERE rated_user_id = p_user_id AND rating = 5;

  SELECT COUNT(*) INTO v_positive_reviews
  FROM ratings WHERE rated_user_id = p_user_id AND is_positive = true;

  SELECT COALESCE(average_rating, 0) INTO v_average_rating
  FROM profiles WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_messages_sent
  FROM chat_messages WHERE user_id = p_user_id;

  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_days_member
  FROM profiles WHERE id = p_user_id;

  -- Check each achievement
  FOR v_achievement IN
    SELECT * FROM achievements
  LOOP
    CASE v_achievement.requirement_type
      WHEN 'sessions_created' THEN
        IF v_sessions_created >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'sessions_joined' THEN
        IF v_sessions_joined >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'total_ratings' THEN
        IF v_total_ratings >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'five_star_ratings' THEN
        IF v_five_star_ratings >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'positive_reviews' THEN
        IF v_positive_reviews >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'high_rating' THEN
        IF v_average_rating >= 4.5 AND v_total_ratings >= 5 THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'excellent_rating' THEN
        IF v_average_rating >= 4.8 AND v_total_ratings >= 10 THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'messages_sent' THEN
        IF v_messages_sent >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      WHEN 'days_member' THEN
        IF v_days_member >= v_achievement.requirement_value THEN
          PERFORM award_achievement(p_user_id, v_achievement.id);
        END IF;
      ELSE
        -- Handle unknown requirement types gracefully
        NULL;
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
