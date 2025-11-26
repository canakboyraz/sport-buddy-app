export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          bio: string | null
          avatar_url: string | null
          city: string | null
          favorite_sports: string | null
          average_rating: number
          total_ratings: number
          positive_reviews_count: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          city?: string | null
          favorite_sports?: string | null
          average_rating?: number
          total_ratings?: number
          positive_reviews_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          city?: string | null
          favorite_sports?: string | null
          average_rating?: number
          total_ratings?: number
          positive_reviews_count?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      sports: {
        Row: {
          id: number
          name: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          icon?: string | null
          created_at?: string
        }
      }
      sport_sessions: {
        Row: {
          id: number
          creator_id: string
          sport_id: number
          title: string
          description: string | null
          location: string
          city: string | null
          latitude: number | null
          longitude: number | null
          session_date: string
          max_participants: number
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any'
          status: 'open' | 'full' | 'completed' | 'cancelled'
          recurring_session_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          creator_id: string
          sport_id: number
          title: string
          description?: string | null
          location: string
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          session_date: string
          max_participants: number
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any'
          status?: 'open' | 'full' | 'completed' | 'cancelled'
          recurring_session_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          creator_id?: string
          sport_id?: number
          title?: string
          description?: string | null
          location?: string
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          session_date?: string
          max_participants?: number
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'any'
          status?: 'open' | 'full' | 'completed' | 'cancelled'
          recurring_session_id?: number | null
          created_at?: string
        }
      }
      session_participants: {
        Row: {
          id: number
          session_id: number
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          joined_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          status?: 'pending' | 'approved' | 'rejected'
          joined_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          joined_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: number
          session_id: number
          user_id: string
          content: string
          image_url: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          content: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          content?: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      ratings: {
        Row: {
          id: number
          session_id: number
          rated_user_id: string
          rater_user_id: string
          rating: number
          comment: string | null
          is_positive: boolean
          created_at: string
        }
        Insert: {
          id?: number
          session_id: number
          rated_user_id: string
          rater_user_id: string
          rating: number
          comment?: string | null
          is_positive?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          rated_user_id?: string
          rater_user_id?: string
          rating?: number
          comment?: string | null
          is_positive?: boolean
          created_at?: string
        }
      }
      friendships: {
        Row: {
          id: number
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      blocked_users: {
        Row: {
          id: number
          blocker_id: string
          blocked_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: number
          blocker_id: string
          blocked_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          blocker_id?: string
          blocked_id?: string
          reason?: string | null
          created_at?: string
        }
      }
      user_reports: {
        Row: {
          id: number
          reporter_id: string
          reported_user_id: string
          report_type: 'harassment' | 'spam' | 'inappropriate' | 'fake_profile' | 'other'
          description: string
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes: string | null
          created_at: string
          updated_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: number
          reporter_id: string
          reported_user_id: string
          report_type: 'harassment' | 'spam' | 'inappropriate' | 'fake_profile' | 'other'
          description: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: number
          reporter_id?: string
          reported_user_id?: string
          report_type?: 'harassment' | 'spam' | 'inappropriate' | 'fake_profile' | 'other'
          description?: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      achievements: {
        Row: {
          id: number
          name: string
          description: string
          icon: string
          category: 'sessions' | 'social' | 'ratings' | 'activity'
          requirement_type: string
          requirement_value: number
          points: number
          color: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description: string
          icon: string
          category: 'sessions' | 'social' | 'ratings' | 'activity'
          requirement_type: string
          requirement_value: number
          points?: number
          color?: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string
          icon?: string
          category?: 'sessions' | 'social' | 'ratings' | 'activity'
          requirement_type?: string
          requirement_value?: number
          points?: number
          color?: string
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: number
          user_id: string
          achievement_id: number
          earned_at: string
        }
        Insert: {
          id?: number
          user_id: string
          achievement_id: number
          earned_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          achievement_id?: number
          earned_at?: string
        }
      }
      user_points: {
        Row: {
          user_id: string
          total_points: number
          level: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_points?: number
          level?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_points?: number
          level?: number
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: number
          user_id: string
          session_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          session_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          session_id?: number
          created_at?: string
        }
      }
      saved_sessions: {
        Row: {
          id: number
          user_id: string
          session_id: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          session_id: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          session_id?: number
          notes?: string | null
          created_at?: string
        }
      }
      typing_indicators: {
        Row: {
          id: number
          session_id: number
          user_id: string
          is_typing: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          is_typing?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          is_typing?: boolean
          updated_at?: string
        }
      }
      recurring_sessions: {
        Row: {
          id: number
          creator_id: string
          sport_id: number
          title: string
          description: string | null
          location: string
          city: string | null
          latitude: number | null
          longitude: number | null
          start_time: string
          duration_minutes: number
          max_participants: number
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any'
          recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          recurrence_day: number | null
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          creator_id: string
          sport_id: number
          title: string
          description?: string | null
          location: string
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          start_time: string
          duration_minutes?: number
          max_participants: number
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any'
          recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          recurrence_day?: number | null
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          creator_id?: string
          sport_id?: number
          title?: string
          description?: string | null
          location?: string
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          start_time?: string
          duration_minutes?: number
          max_participants?: number
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'any'
          recurrence_type?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          recurrence_day?: number | null
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_user_blocked: {
        Args: {
          checker_id: string
          target_id: string
        }
        Returns: boolean
      }
      are_users_blocking: {
        Args: {
          user_a: string
          user_b: string
        }
        Returns: boolean
      }
      block_user: {
        Args: {
          p_blocker_id: string
          p_blocked_id: string
          p_reason?: string
        }
        Returns: number
      }
      unblock_user: {
        Args: {
          p_blocker_id: string
          p_blocked_id: string
        }
        Returns: boolean
      }
      report_user: {
        Args: {
          p_reporter_id: string
          p_reported_user_id: string
          p_report_type: string
          p_description: string
        }
        Returns: number
      }
      get_friendship_status: {
        Args: {
          current_user_id: string
          other_user_id: string
        }
        Returns: string
      }
      award_achievement: {
        Args: {
          p_user_id: string
          p_achievement_id: number
        }
        Returns: boolean
      }
      check_and_award_achievements: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      calculate_level: {
        Args: {
          points: number
        }
        Returns: number
      }
      get_next_session_date: {
        Args: {
          p_recurring_id: number
          p_from_date?: string
        }
        Returns: string
      }
      create_session_from_recurring: {
        Args: {
          p_recurring_id: number
          p_session_date: string
        }
        Returns: number
      }
      generate_recurring_sessions: {
        Args: {
          p_recurring_id: number
          p_days_ahead?: number
        }
        Returns: Array<{
          session_id: number
          session_date: string
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
