import { supabase } from './supabase';
import { Rating } from '../types';

/**
 * Rating Service
 * Handles all rating-related operations with time validation and badge awards
 */

/**
 * Check if user can rate participants after a session
 * Returns true if at least 1 hour has passed since session end
 */
export async function canRateSession(sessionId: number): Promise<{
  canRate: boolean;
  reason?: string;
  hoursRemaining?: number;
}> {
  try {
    const { data: session, error } = await supabase
      .from('sport_sessions')
      .select('session_date')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return { canRate: false, reason: 'Seans bulunamadı' };
    }

    const sessionDate = new Date(session.session_date);
    const now = new Date();
    const hoursSinceSession = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSession < 1) {
      const hoursRemaining = Math.ceil(1 - hoursSinceSession);
      return {
        canRate: false,
        reason: `Değerlendirme yapmak için seans bitiminden 1 saat geçmesi gerekiyor`,
        hoursRemaining,
      };
    }

    return { canRate: true };
  } catch (error) {
    console.error('[ratingService] Error checking rating eligibility:', error);
    return { canRate: false, reason: 'Kontrol edilirken bir hata oluştu' };
  }
}

/**
 * Check if user has already rated another user in a specific session
 */
export async function hasRatedUser(
  sessionId: number,
  raterUserId: string,
  ratedUserId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('rater_user_id', raterUserId)
      .eq('rated_user_id', ratedUserId)
      .maybeSingle();

    if (error) {
      console.error('[ratingService] Error checking existing rating:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[ratingService] Error in hasRatedUser:', error);
    return false;
  }
}

/**
 * Submit a rating for a user with automatic positive review detection
 */
export async function submitRating(params: {
  sessionId: number;
  ratedUserId: string;
  raterUserId: string;
  rating: number;
  comment?: string;
  isPositive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { sessionId, ratedUserId, raterUserId, rating, comment, isPositive } = params;

    // Check if enough time has passed
    const canRate = await canRateSession(sessionId);
    if (!canRate.canRate) {
      return { success: false, error: canRate.reason };
    }

    // Check if already rated
    const alreadyRated = await hasRatedUser(sessionId, raterUserId, ratedUserId);
    if (alreadyRated) {
      return { success: false, error: 'Bu kullanıcıyı bu seans için zaten değerlendirdiniz' };
    }

    // Determine if positive (4+ stars is considered positive)
    const isPosReview = isPositive !== undefined ? isPositive : rating >= 4;

    // Insert rating (without is_positive for now - will be calculated via trigger)
    const { error: insertError } = await supabase.from('ratings').insert({
      session_id: sessionId,
      rated_user_id: ratedUserId,
      rater_user_id: raterUserId,
      rating,
      comment: comment?.trim() || null,
    });

    if (insertError) {
      console.error('[ratingService] Error submitting rating:', insertError);
      return { success: false, error: 'Değerlendirme kaydedilemedi' };
    }

    // Stats and badges are automatically updated via database trigger
    return { success: true };
  } catch (error) {
    console.error('[ratingService] Error in submitRating:', error);
    return { success: false, error: 'Bir hata oluştu' };
  }
}

/**
 * Get ratings for a specific user
 */
export async function getUserRatings(
  userId: string,
  limit: number = 20
): Promise<Rating[]> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        rater:profiles!ratings_rater_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('rated_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ratingService] Error fetching ratings:', error);
      return [];
    }

    return (data || []) as Rating[];
  } catch (error) {
    console.error('[ratingService] Error in getUserRatings:', error);
    return [];
  }
}

/**
 * Get user rating statistics
 */
export async function getUserRatingStats(userId: string): Promise<{
  averageRating: number;
  totalRatings: number;
  positiveReviewsCount: number;
  ratingDistribution: Record<number, number>;
}> {
  try {
    // Get profile stats (updated via trigger)
    const { data: profile } = await supabase
      .from('profiles')
      .select('average_rating, total_ratings, positive_reviews_count')
      .eq('id', userId)
      .single();

    // Get rating distribution
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('rated_user_id', userId);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings?.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      }
    });

    return {
      averageRating: profile?.average_rating || 0,
      totalRatings: profile?.total_ratings || 0,
      positiveReviewsCount: profile?.positive_reviews_count || 0,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error('[ratingService] Error in getUserRatingStats:', error);
    return {
      averageRating: 0,
      totalRatings: 0,
      positiveReviewsCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
}

/**
 * Get participants that can be rated for a session
 */
export async function getRatableParticipants(
  sessionId: number,
  currentUserId: string
): Promise<Array<{ id: string; full_name: string; avatar_url?: string; hasRated: boolean }>> {
  try {
    // Get all approved participants except current user
    const { data: participants, error } = await supabase
      .from('session_participants')
      .select(`
        user_id,
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .eq('status', 'approved')
      .neq('user_id', currentUserId);

    if (error) {
      console.error('[ratingService] Error fetching participants:', error);
      return [];
    }

    if (!participants || participants.length === 0) {
      return [];
    }

    // Get existing ratings by current user for this session
    const { data: existingRatings } = await supabase
      .from('ratings')
      .select('rated_user_id')
      .eq('session_id', sessionId)
      .eq('rater_user_id', currentUserId);

    const ratedUserIds = new Set(existingRatings?.map((r) => r.rated_user_id) || []);

    return participants
      .map((p: any) => ({
        id: p.user?.id,
        full_name: p.user?.full_name || 'Kullanıcı',
        avatar_url: p.user?.avatar_url,
        hasRated: ratedUserIds.has(p.user?.id),
      }))
      .filter((p) => p.id); // Filter out any null users
  } catch (error) {
    console.error('[ratingService] Error in getRatableParticipants:', error);
    return [];
  }
}

/**
 * Get badge level based on positive reviews count
 */
export function getBadgeLevel(positiveReviewsCount: number): {
  level: string;
  icon: string;
  color: string;
  nextMilestone?: number;
} {
  if (positiveReviewsCount >= 100) {
    return {
      level: 'Süperstar',
      icon: 'diamond',
      color: '#9C27B0',
    };
  } else if (positiveReviewsCount >= 50) {
    return {
      level: 'Efsane',
      icon: 'crown',
      color: '#FFD700',
      nextMilestone: 100,
    };
  } else if (positiveReviewsCount >= 25) {
    return {
      level: 'Çok Beğenilen',
      icon: 'heart-multiple',
      color: '#FF4081',
      nextMilestone: 50,
    };
  } else if (positiveReviewsCount >= 10) {
    return {
      level: 'Beğenilen',
      icon: 'heart',
      color: '#E91E63',
      nextMilestone: 25,
    };
  } else if (positiveReviewsCount >= 3) {
    return {
      level: 'İyi Başlangıç',
      icon: 'thumb-up-outline',
      color: '#4CAF50',
      nextMilestone: 10,
    };
  } else {
    return {
      level: 'Yeni',
      icon: 'star-outline',
      color: '#9E9E9E',
      nextMilestone: 3,
    };
  }
}
