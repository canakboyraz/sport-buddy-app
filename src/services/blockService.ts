/**
 * Block Service
 * Handles checking if users are blocked
 */

import { supabase } from './supabase';

/**
 * Check if a user is blocked by the current user
 */
export async function isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
}

/**
 * Check if current user is blocked by another user
 */
export async function isBlockedBy(currentUserId: string, otherUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', otherUserId)
      .eq('blocked_id', currentUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if blocked by user:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if blocked by user:', error);
    return false;
  }
}

/**
 * Check if there's any block relationship between two users
 */
export async function hasBlockRelationship(userId1: string, userId2: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
      .maybeSingle();

    if (error) {
      console.error('Error checking block relationship:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking block relationship:', error);
    return false;
  }
}

/**
 * Get list of blocked user IDs for a user
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      // Silently return empty array if table doesn't exist yet
      if (error.code === 'PGRST205' || error.message?.includes('user_blocks')) {
        return [];
      }
      console.error('Error getting blocked users:', error);
      return [];
    }

    return data?.map(block => block.blocked_id) || [];
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
}

/**
 * Get list of user IDs who have blocked the current user
 */
export async function getBlockerUserIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', userId);

    if (error) {
      // Silently return empty array if table doesn't exist yet
      if (error.code === 'PGRST205' || error.message?.includes('user_blocks')) {
        return [];
      }
      console.error('Error getting blocker users:', error);
      return [];
    }

    return data?.map(block => block.blocker_id) || [];
  } catch (error) {
    console.error('Error getting blocker users:', error);
    return [];
  }
}
