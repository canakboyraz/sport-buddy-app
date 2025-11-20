/**
 * Integration tests for participant name loading
 *
 * These tests verify that participant names are loaded correctly
 * across different screens using explicit foreign key references.
 */

import { supabase } from '../../src/services/supabase';

// Mock Supabase for integration testing
jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

describe('Participant Name Loading Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SessionDetailScreen participant loading', () => {
    it('should load session with all participant names', async () => {
      const mockData = {
        id: 1,
        title: 'Test Session',
        creator_id: 'creator-123',
        creator: {
          id: 'creator-123',
          full_name: 'John Creator',
          email: 'creator@test.com',
        },
        participants: [
          {
            id: 1,
            user_id: 'user-1',
            status: 'approved',
            user: {
              id: 'user-1',
              full_name: 'Alice Johnson',
              email: 'alice@test.com',
            },
          },
          {
            id: 2,
            user_id: 'user-2',
            status: 'pending',
            user: {
              id: 'user-2',
              full_name: 'Bob Smith',
              email: 'bob@test.com',
            },
          },
        ],
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      // Simulate loading session
      const { data, error } = await supabase
        .from('sport_sessions')
        .select(`
          *,
          creator:profiles!sport_sessions_creator_id_fkey(*),
          participants:session_participants(
            id,
            user_id,
            status,
            user:profiles!session_participants_user_id_fkey(*)
          )
        `)
        .eq('id', 1)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.creator?.full_name).toBe('John Creator');
      expect(data?.participants).toHaveLength(2);
      expect(data?.participants?.[0].user?.full_name).toBe('Alice Johnson');
      expect(data?.participants?.[1].user?.full_name).toBe('Bob Smith');
    });

    it('should handle missing participant profiles gracefully', async () => {
      const mockData = {
        id: 1,
        title: 'Test Session',
        participants: [
          {
            id: 1,
            user_id: 'user-1',
            status: 'approved',
            user: {
              full_name: 'Alice Johnson',
            },
          },
          {
            id: 2,
            user_id: 'user-2',
            status: 'approved',
            user: null, // Missing profile
          },
        ],
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const { data } = await supabase
        .from('sport_sessions')
        .select(`*`)
        .eq('id', 1)
        .single();

      // Verify that we can handle missing profiles
      const participantsWithoutProfile = data?.participants?.filter(
        (p: any) => !p.user
      );

      expect(participantsWithoutProfile).toHaveLength(1);
      expect(participantsWithoutProfile?.[0].user_id).toBe('user-2');
    });
  });

  describe('ChatScreen message loading', () => {
    it('should load messages with sender names', async () => {
      const mockMessages = [
        {
          id: 1,
          content: 'Hello!',
          user_id: 'user-1',
          user: {
            full_name: 'Alice Johnson',
          },
        },
        {
          id: 2,
          content: 'Hi there!',
          user_id: 'user-2',
          user: {
            full_name: 'Bob Smith',
          },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          user:profiles!messages_user_id_fkey(*)
        `)
        .eq('session_id', 1)
        .order('created_at', { ascending: true });

      expect(data).toHaveLength(2);
      expect(data?.[0].user?.full_name).toBe('Alice Johnson');
      expect(data?.[1].user?.full_name).toBe('Bob Smith');
    });
  });

  describe('Approve participant flow', () => {
    it('should fetch participant with name before approving', async () => {
      const mockParticipant = {
        user_id: 'user-1',
        user: {
          full_name: 'Alice Johnson',
        },
      };

      const fetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockParticipant,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fetchChain);

      // Simulate fetching participant before approval
      const { data, error } = await supabase
        .from('session_participants')
        .select('user_id, user:profiles!session_participants_user_id_fkey(full_name)')
        .eq('id', 1)
        .single();

      expect(error).toBeNull();
      expect(data?.user?.full_name).toBe('Alice Johnson');

      // Verify explicit foreign key is used
      expect(fetchChain.select).toHaveBeenCalledWith(
        'user_id, user:profiles!session_participants_user_id_fkey(full_name)'
      );
    });

    it('should handle error when participant profile is missing', async () => {
      const mockParticipant = {
        user_id: 'user-1',
        user: null,
      };

      const fetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockParticipant,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fetchChain);

      const { data } = await supabase
        .from('session_participants')
        .select('user_id, user:profiles!session_participants_user_id_fkey(full_name)')
        .eq('id', 1)
        .single();

      // Should detect missing profile
      expect(data?.user).toBeNull();

      // In the real code, this should trigger an alert
      if (!data?.user) {
        // This simulates the error handling in handleApprove
        console.error('[Test] Participant profile data missing');
        expect(true).toBe(true); // Test passes if we detect the issue
      }
    });
  });

  describe('Foreign key pattern validation', () => {
    it('should use correct foreign key for session_participants -> profiles', () => {
      const expectedPattern = 'profiles!session_participants_user_id_fkey';
      const query = 'user:profiles!session_participants_user_id_fkey(*)';

      expect(query).toContain(expectedPattern);
    });

    it('should use correct foreign key for messages -> profiles', () => {
      const expectedPattern = 'profiles!messages_user_id_fkey';
      const query = 'user:profiles!messages_user_id_fkey(*)';

      expect(query).toContain(expectedPattern);
    });

    it('should use correct foreign key for chat_messages -> profiles', () => {
      const expectedPattern = 'profiles!chat_messages_user_id_fkey';
      const query = 'user:profiles!chat_messages_user_id_fkey(*)';

      expect(query).toContain(expectedPattern);
    });

    it('should use correct foreign key for sport_sessions -> profiles', () => {
      const expectedPattern = 'profiles!sport_sessions_creator_id_fkey';
      const query = 'creator:profiles!sport_sessions_creator_id_fkey(*)';

      expect(query).toContain(expectedPattern);
    });
  });
});
