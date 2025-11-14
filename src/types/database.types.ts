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
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
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
          skill_level: string
          status: string
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
          skill_level: string
          status?: string
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
          skill_level?: string
          status?: string
          created_at?: string
        }
      }
      session_participants: {
        Row: {
          id: number
          session_id: number
          user_id: string
          status: string
          joined_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          status?: string
          joined_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          status?: string
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: number
          session_id: number
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          content?: string
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
          created_at: string
        }
        Insert: {
          id?: number
          session_id: number
          rated_user_id: string
          rater_user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          rated_user_id?: string
          rater_user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
    }
  }
}
