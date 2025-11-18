import { supabase } from './supabase';
import { Achievement, UserAchievement } from '../types';

/**
 * Achievement Service
 * Handles all achievement-related operations
 */

/**
 * Get all available achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('points', { ascending: true });

  if (error) {
    console.error('[achievementService] Error fetching achievements:', error);
    return [];
  }

  return data as Achievement[];
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('[achievementService] Error fetching user achievements:', error);
    return [];
  }

  return data as UserAchievement[];
}

/**
 * Get user's achievement stats
 */
export async function getUserAchievementStats(userId: string) {
  const [allAchievements, userAchievements] = await Promise.all([
    getAllAchievements(),
    getUserAchievements(userId),
  ]);

  const totalPoints = userAchievements.reduce(
    (sum, ua) => sum + (ua.achievement?.points || 0),
    0
  );

  const achievementsByRarity = userAchievements.reduce((acc, ua) => {
    const rarity = ua.achievement?.rarity || 'common';
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalAchievements: allAchievements.length,
    unlockedAchievements: userAchievements.length,
    totalPoints,
    completionPercentage: Math.round(
      (userAchievements.length / allAchievements.length) * 100
    ),
    achievementsByRarity,
  };
}

/**
 * Check if user has a specific achievement
 */
export async function hasAchievement(
  userId: string,
  achievementCode: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('id, achievement:achievements!inner(code)')
    .eq('user_id', userId)
    .eq('achievement.code', achievementCode)
    .maybeSingle();

  if (error) {
    console.error('[achievementService] Error checking achievement:', error);
    return false;
  }

  return !!data;
}

/**
 * Manually trigger achievement check for a user
 * This calls the database function to check all achievements
 */
export async function checkAchievements(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_achievements', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[achievementService] Error checking achievements:', error);
      return [];
    }

    // Return the array of newly awarded achievement IDs
    return data || [];
  } catch (error) {
    console.error('[achievementService] Error in checkAchievements:', error);
    return [];
  }
}

/**
 * Get achievement rarity color
 */
export function getAchievementRarityColor(
  rarity: string
): { bg: string; text: string; border: string } {
  switch (rarity) {
    case 'legendary':
      return { bg: '#FFD700', text: '#8B4513', border: '#FFA500' }; // Gold
    case 'epic':
      return { bg: '#9C27B0', text: '#FFFFFF', border: '#7B1FA2' }; // Purple
    case 'rare':
      return { bg: '#2196F3', text: '#FFFFFF', border: '#1976D2' }; // Blue
    case 'common':
    default:
      return { bg: '#757575', text: '#FFFFFF', border: '#616161' }; // Gray
  }
}

/**
 * Get achievement category icon
 */
export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'participation':
      return 'run';
    case 'social':
      return 'account-group';
    case 'creation':
      return 'calendar-plus';
    case 'special':
      return 'star-circle';
    default:
      return 'trophy';
  }
}

/**
 * Subscribe to new achievement unlocks for a user
 * Returns unsubscribe function
 */
export function subscribeToAchievements(
  userId: string,
  callback: (achievement: UserAchievement) => void
): () => void {
  const channel = supabase
    .channel(`user_achievements:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch the full achievement data
        const { data, error } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievements(*)
          `)
          .eq('id', payload.new.id)
          .single();

        if (!error && data) {
          callback(data as UserAchievement);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
