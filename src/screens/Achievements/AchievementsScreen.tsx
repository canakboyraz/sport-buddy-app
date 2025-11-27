import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, ActivityIndicator, ProgressBar, Chip, Divider, useTheme as usePaperTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
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
        return t('achievement.category.sessions');
      case 'ratings':
        return t('achievement.category.ratings');
      case 'activity':
        return t('achievement.category.activity');
      default:
        return category;
    }
  };

  const renderAchievement = (item: AchievementProgress) => {
    const { achievement, earned, current, required, progress } = item;

    return (
      <Card
        key={achievement.id}
        style={[
          styles.achievementCard,
          { backgroundColor: theme.colors.surface },
          earned && { backgroundColor: theme.colors.primaryContainer + '30' }
        ]}
        mode="elevated"
      >
        <Card.Content style={styles.achievementContent}>
          <View style={[styles.achievementIcon, { backgroundColor: earned ? achievement.color + '20' : theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name={achievement.icon as any}
              size={48}
              color={earned ? achievement.color : theme.colors.onSurfaceVariant}
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={[
              styles.achievementName,
              { color: theme.colors.onSurface },
              earned && { color: theme.colors.primary }
            ]}>
              {achievement.name}
            </Text>
            <Text style={[styles.achievementDescription, { color: theme.colors.onSurfaceVariant }]}>{achievement.description}</Text>

            {!earned && (
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={progress}
                  color={achievement.color}
                  style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}
                />
                <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                  {current}/{required}
                </Text>
              </View>
            )}

            <View style={styles.achievementFooter}>
              <Chip
                icon={getCategoryIcon(achievement.category)}
                style={[styles.categoryChip, { backgroundColor: theme.colors.secondaryContainer }]}
                textStyle={[styles.chipText, { color: theme.colors.onSecondaryContainer }]}
                compact
              >
                {getCategoryName(achievement.category)}
              </Chip>
              <Chip
                icon="star"
                style={[styles.pointsChip, { backgroundColor: theme.colors.tertiaryContainer }]}
                textStyle={[styles.chipText, { color: theme.colors.onTertiaryContainer }]}
                compact
              >
                {achievement.points} {t('achievement.points')}
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Level Card */}
      <Card style={styles.levelCard} mode="elevated">
        <LinearGradient
          colors={
            isDarkMode
              ? [theme.colors.primary, theme.colors.secondary]
              : [theme.colors.primary, '#9C27B0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Card.Content>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelText}>{t('achievement.level')} {userPoints.level}</Text>
                <Text style={styles.pointsText}>{userPoints.total_points} {t('achievement.points')}</Text>
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
                {t('achievement.pointsToNextLevel', { points: getPointsToNextLevel() })}
              </Text>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Stats Card */}
      <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('achievement.statistics')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{earnedCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{t('achievement.earned')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalAchievements - earnedCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{t('achievement.remaining')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{completionPercentage.toFixed(0)}%</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{t('achievement.completion')}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Achievements by Category */}
      {Object.entries(groupedAchievements).map(([category, items]) => (
        <View key={category} style={styles.categorySection}>
          <View style={[styles.categoryHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons
              name={getCategoryIcon(category) as any}
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>{getCategoryName(category)}</Text>
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
    borderRadius: 20,
  },
  gradient: {
    borderRadius: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelText: {
    fontSize: 28,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  statsCard: {
    margin: 15,
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 20,
    padding: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
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
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  achievementCard: {
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 16,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementIcon: {
    marginRight: 15,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
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
    marginTop: 4,
    fontWeight: '500',
  },
  achievementFooter: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  categoryChip: {},
  pointsChip: {},
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});
