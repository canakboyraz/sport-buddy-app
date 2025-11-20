import { supabase } from './supabase';

export interface FriendRequest {
    id: number;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    requester?: any;
    target?: any;
}

export interface FriendshipStatus {
    status: 'pending' | 'accepted' | 'rejected' | null;
    is_requester: boolean;
    friendship_id?: number;
}

export const friendService = {
    async sendFriendRequest(targetId: string, userId: string) {
        const { error } = await supabase.rpc('send_friend_request', {
            requester_id: userId,
            target_id: targetId,
        });
        if (error) throw error;
    },

    async acceptFriendRequest(friendshipId: number, userId: string) {
        const { error } = await supabase.rpc('accept_friend_request', {
            friendship_id: friendshipId,
            accepter_id: userId,
        });
        if (error) throw error;
    },

    async rejectFriendRequest(friendshipId: number, userId: string) {
        const { error } = await supabase.rpc('reject_friend_request', {
            friendship_id: friendshipId,
            rejecter_id: userId,
        });
        if (error) throw error;
    },

    async cancelFriendRequest(friendshipId: number) {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);
        if (error) throw error;
    },

    async removeFriend(friendId: string, userId: string) {
        const { error } = await supabase.rpc('remove_friend', {
            user_a: userId,
            user_b: friendId,
        });
        if (error) throw error;
    },

    async checkFriendshipStatus(targetId: string, userId: string): Promise<FriendshipStatus | null> {
        const { data, error } = await supabase.rpc('get_friendship_status', {
            user_a: userId,
            user_b: targetId,
        });

        if (error) throw error;

        if (data && data.length > 0) {
            return {
                status: data[0].status,
                is_requester: data[0].is_requester,
            };
        }

        return null;
    },

    async getFriendRequests(userId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!friendships_user_id_fkey(*),
        target:profiles!friendships_friend_id_fkey(*)
      `)
            .eq('friend_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getSentRequests(userId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!friendships_user_id_fkey(*),
        target:profiles!friendships_friend_id_fkey(*)
      `)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getFriends(userId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
        id,
        user_id,
        friend_id,
        requester:profiles!friendships_user_id_fkey(*),
        target:profiles!friendships_friend_id_fkey(*)
      `)
            .eq('status', 'accepted')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (error) throw error;

        if (data) {
            return data.map((friendship: any) => {
                if (friendship.user_id === userId) {
                    return friendship.target;
                } else {
                    return friendship.requester;
                }
            }).filter(Boolean);
        }
        return [];
    }
};
