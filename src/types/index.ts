export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  average_rating?: number;
  total_ratings?: number;
  positive_reviews_count?: number;
}

export interface Sport {
  id: number;
  name: string;
  icon?: string;
  created_at: string;
}

export interface SportSession {
  id: number;
  creator_id: string;
  sport_id: number;
  title: string;
  description?: string;
  location: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  session_date: string;
  max_participants: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any';
  status: 'open' | 'full' | 'completed' | 'cancelled';
  created_at: string;
  creator?: Profile;
  sport?: Sport;
  participants?: SessionParticipant[];
}

export interface SessionParticipant {
  id: number;
  session_id: number;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  user?: Profile;
}

export interface Message {
  id: number;
  session_id: number;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface Rating {
  id: number;
  session_id: number;
  rated_user_id: string;
  rater_user_id: string;
  rating: number;
  comment?: string;
  is_positive?: boolean;
  created_at: string;
  rater?: Profile;
  rated_user?: Profile;
}

export interface ExtendedMessage extends Message {
  image_url?: string;
  is_read?: boolean;
  read_at?: string;
}

export interface Friendship {
  id: number;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  user?: Profile;
  friend?: Profile;
}

export type MaterialIconName = string;
export type SkillLevel = 'Başlangıç' | 'Orta' | 'İleri' | 'Profesyonel' | 'beginner' | 'intermediate' | 'advanced' | 'any';

export type AchievementCategory = 'participation' | 'social' | 'creation' | 'special';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  achievement?: Achievement;
}
