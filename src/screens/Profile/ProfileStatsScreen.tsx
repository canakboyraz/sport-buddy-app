import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator, Divider, Surface, useTheme as usePaperTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

interface UserStats {
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalRatingsReceived: number;
  averageRating: number;
  favoriteSport: string | null;
  memberSince: string;
  totalChatMessages: number;
  upcomingSessions: number;
  completedSessions: number;
}

export default function ProfileStatsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { count: sessionsCreated } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id);

      const { count: sessionsJoined } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('rated_user_id', user.id);

      const totalRatings = ratingsData?.length || 0;
      const avgRating = totalRatings > 0
        ? ratingsData!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at, favorite_sports')
        .eq('id', user.id)
        .single();

      const now = new Date().toISOString();
      const { count: upcoming } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .gte('session_date', now);

      const { count: completed } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .lt('session_date', now);

      const { count: chatMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const favSports = profileData?.favorite_sports || '';
      const favSport = favSports.split(',')[0]?.trim() || null;

      setStats({
        totalSessionsCreated: sessionsCreated || 0,
        totalSessionsJoined: sessionsJoined || 0,
        totalRatingsReceived: totalRatings,
        averageRating: Math.round(avgRating * 10) / 10,
        favoriteSport: favSport,
        memberSince: profileData?.created_at || '',
        totalChatMessages: chatMessages || 0,
        upcomingSessions: upcoming || 0,
        completedSessions: completed || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }

    setLoading(false);
  };

  const StatItem = ({ icon, label, value, color }: {
    icon: string;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <View style={styles.statItem}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onBackground }}>{t('stats.loadError')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? [theme.colors.background, theme.colors.background]
          : [theme.colors.primaryContainer + '20', theme.colors.background]
      }
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* General Stats */}
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-box" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('stats.general')}
            </Text>
          </View>

          <StatItem icon="calendar-plus" label={t('stats.sessionsCreated')} value={stats.totalSessionsCreated} color="#4CAF50" />
          <Divider style={styles.divider} />
          <StatItem icon="account-group" label={t('stats.sessionsJoined')} value={stats.totalSessionsJoined} color="#2196F3" />
          <Divider style={styles.divider} />
          <StatItem icon="calendar-clock" label={t('stats.upcomingSessions')} value={stats.upcomingSessions} color="#FF9800" />
          <Divider style={styles.divider} />
          <StatItem icon="calendar-check" label={t('stats.completedSessions')} value={stats.completedSessions} color="#9C27B0" />
        </Surface>

        {/* Ratings */}
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="star-box" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('stats.ratings')}
            </Text>
          </View>

          <StatItem icon="star" label={t('stats.averageRating')} value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'} color="#FFD700" />
          <Divider style={styles.divider} />
          <StatItem icon="star-box-multiple" label={t('stats.totalRatings')} value={stats.totalRatingsReceived} color="#FFC107" />
        </Surface>

        {/* Activity */}
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('stats.activity')}
            </Text>
          </View>

          <StatItem icon="message-text" label={t('stats.messagesSent')} value={stats.totalChatMessages} color="#00BCD4" />
          {stats.favoriteSport && (
            <>
              <Divider style={styles.divider} />
              <StatItem icon="trophy" label={t('stats.favoriteSport')} value={stats.favoriteSport} color="#E91E63" />
            </>
          )}
          <Divider style={styles.divider} />
          <StatItem icon="calendar-account" label={t('stats.memberSince')} value={format(new Date(stats.memberSince), 'dd MMM yyyy', { locale: getDateLocale() })} color="#607D8B" />
        </Surface>

        {/* Summary */}
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
          <Text style={[styles.summaryTitle, { color: theme.colors.onSurface }]}>{t('stats.summary')}</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: theme.colors.primary }]}>
                {stats.totalSessionsCreated + stats.totalSessionsJoined}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                {t('stats.totalSessions')}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: theme.colors.secondary }]}>
                {stats.totalChatMessages}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                {t('stats.messages')}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: theme.colors.tertiary }]}>
                {stats.totalRatingsReceived}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                {t('stats.ratingsCount')}
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
  },
  divider: {
    marginVertical: 4,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
