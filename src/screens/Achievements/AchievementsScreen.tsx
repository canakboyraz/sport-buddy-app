import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, ActivityIndicator, ProgressBar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  color: string;
}

interface UserAchievement {
  id: number;
  achievement_id: number;
  earned_at: string;
  achievement: Achievement;
}

interface UserPoints {
  total_points: number;
  level: number;
}

interface AchievementProgress {
  achievement: Achievement;
  earned: boolean;
  current: number;
  required: number;
  progress: number;
}

const { width } = Dimensions.get('window');

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints>({ total_points: 0, level: 1 });
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Check and award any new achievements
      await supabase.rpc('check_and_award_achievements', { p_user_id: user.id });

      // Get user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points, level')
        .eq('user_id', user.id)
        .single();

      if (pointsData) {
        setUserPoints(pointsData);
      }

      // Get all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });

      // Get user's earned achievements
      const { data: earnedAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);

      const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
      setEarnedCount(earnedIds.size);

      // Get user stats for progress calculation
      const stats = await getUserStats();

      // Build achievement progress array
      const progressArray: AchievementProgress[] = (allAchievements || []).map(achievement => {
        const earned = earnedIds.has(achievement.id);
        const current = getCurrentValue(achievement.requirement_type, stats);
        const required = achievement.requirement_value;
        const progress = Math.min(current / required, 1);

        return {
          achievement,
          earned,
          current,
          required,
          progress,
        };
      });

      setAchievements(progressArray);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }

    setLoading(false);
  };

  const getUserStats = async () => {
    if (!user) return {};

    const [sessionsCreated, sessionsJoined, totalRatings, fiveStarRatings, messagesSent, profile] = await Promise.all([
      supabase.from('sport_sessions').select('id', { count: 'exact', head: true }).eq('creator_id', user.id),
      supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
      supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('rated_user_id', user.id),
      supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('rated_user_id', user.id).eq('rating', 5),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('created_at').eq('id', user.id).single(),
    ]);

    const daysMember = profile.data?.created_at
      ? Math.floor((Date.now() - new Date(profile.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      sessions_created: sessionsCreated.count || 0,
      sessions_joined: sessionsJoined.count || 0,
      total_ratings: totalRatings.count || 0,
      five_star_ratings: fiveStarRatings.count || 0,
      messages_sent: messagesSent.count || 0,
      days_member: daysMember,
    };
  };

  const getCurrentValue = (requirementType: string, stats: any): number => {
    switch (requirementType) {
      case 'sessions_created':
        return stats.sessions_created || 0;
      case 'sessions_joined':
        return stats.sessions_joined || 0;
      case 'total_ratings':
        return stats.total_ratings || 0;
      case 'five_star_ratings':
        return stats.five_star_ratings || 0;
      case 'messages_sent':
        return stats.messages_sent || 0;
      case 'days_member':
        return stats.days_member || 0;
      default:
        return 0;
    }
  };

  const getLevelProgress = (): number => {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    // Points for current level: (level - 1)^2 * 100
    // Points for next level: level^2 * 100
    const currentLevelPoints = Math.pow(userPoints.level - 1, 2) * 100;
    const nextLevelPoints = Math.pow(userPoints.level, 2) * 100;
    const pointsInLevel = userPoints.total_points - currentLevelPoints;
    const pointsNeeded = nextLevelPoints - currentLevelPoints;
    return pointsNeeded > 0 ? pointsInLevel / pointsNeeded : 0;
  };

  const getPointsToNextLevel = (): number => {
    const nextLevelPoints = Math.pow(userPoints.level, 2) * 100;
    return nextLevelPoints - userPoints.total_points;
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'sessions':
        return 'calendar-star';
      case 'ratings':
        return 'star-box';
      case 'activity':
        return 'lightning-bolt';
      default:
        return 'trophy';
    }
  };

  const getCategoryName = (category: string): string => {
    switch (category) {
      case 'sessions':
        return 'Seanslar';
      case 'ratings':
        return 'Değerlendirmeler';
      case 'activity':
        return 'Aktivite';
      default:
        return category;
    }
  };

  const renderAchievement = (item: AchievementProgress) => {
    const { achievement, earned, current, required, progress } = item;

    return (
      <Card
        key={achievement.id}
        style={[styles.achievementCard, earned && styles.earnedCard]}
        mode="elevated"
      >
        <Card.Content style={styles.achievementContent}>
          <View style={styles.achievementIcon}>
            <MaterialCommunityIcons
              name={achievement.icon as any}
              size={48}
              color={earned ? achievement.color : '#ccc'}
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, earned && styles.earnedText]}>
              {achievement.name}
            </Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>

            {!earned && (
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progress}
                  color={achievement.color}
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>
                  {current}/{required}
                </Text>
              </View>
            )}

            <View style={styles.achievementFooter}>
              <Chip
                icon={getCategoryIcon(achievement.category)}
                style={styles.categoryChip}
                textStyle={styles.chipText}
                compact
              >
                {getCategoryName(achievement.category)}
              </Chip>
              <Chip
                icon="star"
                style={styles.pointsChip}
                textStyle={styles.chipText}
                compact
              >
                {achievement.points} puan
              </Chip>
            </View>
          </View>
          {earned && (
            <View style={styles.checkmark}>
              <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const totalAchievements = achievements.length;
  const completionPercentage = totalAchievements > 0 ? (earnedCount / totalAchievements) * 100 : 0;

  // Group achievements by category
  const groupedAchievements = achievements.reduce((acc, item) => {
    const category = item.achievement.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, AchievementProgress[]>);

  return (
    <ScrollView style={styles.container}>
      {/* Level Card */}
      <Card style={styles.levelCard} mode="elevated">
        <LinearGradient
          colors={['#6200ee', '#9C27B0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Card.Content>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelText}>Seviye {userPoints.level}</Text>
                <Text style={styles.pointsText}>{userPoints.total_points} Puan</Text>
              </View>
              <MaterialCommunityIcons name="trophy" size={64} color="#FFD700" />
            </View>
            <View style={styles.levelProgressContainer}>
              <ProgressBar
                progress={getLevelProgress()}
                color="#FFD700"
                style={styles.levelProgressBar}
              />
              <Text style={styles.levelProgressText}>
                Bir sonraki seviyeye {getPointsToNextLevel()} puan kaldı
              </Text>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Stats Card */}
      <Card style={styles.statsCard} mode="elevated">
        <Card.Content>
          <Text style={styles.sectionTitle}>Başarı İstatistikleri</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnedCount}</Text>
              <Text style={styles.statLabel}>Kazanılan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAchievements - earnedCount}</Text>
              <Text style={styles.statLabel}>Kalan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionPercentage.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Tamamlanma</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Achievements by Category */}
      {Object.entries(groupedAchievements).map(([category, items]) => (
        <View key={category} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <MaterialCommunityIcons
              name={getCategoryIcon(category) as any}
              size={24}
              color="#6200ee"
            />
            <Text style={styles.categoryTitle}>{getCategoryName(category)}</Text>
          </View>
          {items.map(renderAchievement)}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCard: {
    margin: 15,
    marginBottom: 10,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  levelProgressContainer: {
    marginTop: 10,
  },
  levelProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelProgressText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  statsCard: {
    margin: 15,
    marginTop: 0,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  achievementCard: {
    marginHorizontal: 15,
    marginVertical: 5,
  },
  earnedCard: {
    backgroundColor: '#f0f7ff',
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementIcon: {
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  earnedText: {
    color: '#6200ee',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  achievementFooter: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#e3f2fd',
  },
  pointsChip: {
    backgroundColor: '#fff3e0',
  },
  chipText: {
    fontSize: 11,
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
