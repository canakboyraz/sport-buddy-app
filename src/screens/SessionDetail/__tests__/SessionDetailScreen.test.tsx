import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SessionDetailScreen from '../SessionDetailScreen';
import { supabase } from '../../../services/supabase';

// Mock dependencies
jest.mock('../../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: { sessionId: 1 },
  }),
}));

jest.mock('../../../services/notificationService', () => ({
  scheduleSessionReminders: jest.fn(),
  cancelSessionReminders: jest.fn(),
  sendParticipantJoinedNotification: jest.fn(),
}));

describe('SessionDetailScreen - Participant Name Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load session with participant profiles using explicit foreign keys', async () => {
    const mockSession = {
      id: 1,
      title: 'Test Session',
      creator_id: 'creator-id',
      sport_id: 1,
      location: 'Test Location',
      session_date: '2025-12-01T10:00:00',
      max_participants: 10,
      skill_level: 'any',
      status: 'open',
      creator: {
        id: 'creator-id',
        full_name: 'Test Creator',
        email: 'creator@test.com',
      },
      sport: {
        id: 1,
        name: 'Futbol',
        icon: 'soccer',
      },
      participants: [
        {
          id: 1,
          user_id: 'participant-1',
          status: 'approved',
          user: {
            id: 'participant-1',
            full_name: 'John Doe',
            email: 'john@test.com',
          },
        },
        {
          id: 2,
          user_id: 'participant-2',
          status: 'pending',
          user: {
            id: 'participant-2',
            full_name: 'Jane Smith',
            email: 'jane@test.com',
          },
        },
      ],
    };

    const mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

    const { getByText } = render(
      <SessionDetailScreen
        navigation={{} as any}
        route={{ params: { sessionId: 1 } } as any}
      />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('sport_sessions');
    });

    // Verify the query includes explicit foreign key references
    expect(mockSupabaseChain.select).toHaveBeenCalledWith(
      expect.stringContaining('profiles!session_participants_user_id_fkey')
    );

    await waitFor(() => {
      expect(getByText('Test Session')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('should show warning when participant profile is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const mockSessionWithMissingProfile = {
      id: 1,
      title: 'Test Session',
      creator_id: 'creator-id',
      sport_id: 1,
      location: 'Test Location',
      session_date: '2025-12-01T10:00:00',
      max_participants: 10,
      skill_level: 'any',
      status: 'open',
      creator: {
        id: 'creator-id',
        full_name: 'Test Creator',
      },
      sport: {
        id: 1,
        name: 'Futbol',
      },
      participants: [
        {
          id: 1,
          user_id: 'participant-1',
          status: 'approved',
          user: null, // Missing profile data
        },
      ],
    };

    const mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockSessionWithMissingProfile,
        error: null
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

    const { getByText } = render(
      <SessionDetailScreen
        navigation={{} as any}
        route={{ params: { sessionId: 1 } } as any}
      />
    );

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SessionDetail] Found participants without profile data:',
        expect.arrayContaining([
          expect.objectContaining({ id: 1, user_id: 'participant-1' })
        ])
      );
    });

    await waitFor(() => {
      expect(getByText('Profil yüklenemedi')).toBeTruthy();
      expect(getByText('Kullanıcı')).toBeTruthy();
    });

    consoleWarnSpy.mockRestore();
  });

  it('should handle approve participant with explicit foreign key', async () => {
    const mockParticipant = {
      user_id: 'participant-1',
      user: {
        full_name: 'John Doe',
      },
    };

    const mockSession = {
      id: 1,
      title: 'Test Session',
      creator_id: 'test-user-id',
      participants: [
        {
          id: 1,
          user_id: 'participant-1',
          status: 'pending',
          user: { full_name: 'John Doe' },
        },
      ],
    };

    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockParticipant, error: null }),
    };

    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    const sessionChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(sessionChain) // Initial load
      .mockReturnValueOnce(fetchChain)   // Fetch participant
      .mockReturnValueOnce(updateChain)  // Update status
      .mockReturnValueOnce(sessionChain); // Reload session

    const { getByText } = render(
      <SessionDetailScreen
        navigation={{} as any}
        route={{ params: { sessionId: 1 } } as any}
      />
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    // Verify fetch uses explicit foreign key
    expect(fetchChain.select).toHaveBeenCalledWith(
      'user_id, user:profiles!session_participants_user_id_fkey(full_name)'
    );
  });

  it('should show error alert when participant profile cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockSession = {
      id: 1,
      title: 'Test Session',
      creator_id: 'test-user-id',
      participants: [
        {
          id: 1,
          user_id: 'participant-1',
          status: 'pending',
          user: { full_name: 'John Doe' },
        },
      ],
    };

    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' }
      }),
    };

    const sessionChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(sessionChain)
      .mockReturnValueOnce(fetchChain);

    render(
      <SessionDetailScreen
        navigation={{} as any}
        route={{ params: { sessionId: 1 } } as any}
      />
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SessionDetail] Error fetching participant data:',
        expect.objectContaining({ message: 'Profile not found' })
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should prevent user action modal when profile is missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const mockSession = {
      id: 1,
      title: 'Test Session',
      creator_id: 'creator-id',
      participants: [
        {
          id: 1,
          user_id: 'participant-1',
          status: 'approved',
          user: null, // Missing profile
        },
      ],
    };

    const mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

    const { getByText } = render(
      <SessionDetailScreen
        navigation={{} as any}
        route={{ params: { sessionId: 1 } } as any}
      />
    );

    await waitFor(() => {
      const userElement = getByText('Kullanıcı');
      fireEvent.press(userElement);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[SessionDetail] Attempted to open user actions for user without profile:',
      'participant-1'
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Hata',
      'Kullanıcı profili yüklenemedi. Sayfayı yenilemeyi deneyin.'
    );

    consoleWarnSpy.mockRestore();
  });
});
