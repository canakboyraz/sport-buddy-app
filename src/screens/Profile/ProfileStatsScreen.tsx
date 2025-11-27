import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { getDateLocale } from '../../utils/dateLocale';

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
      // Get total sessions created
      const { count: sessionsCreated } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id);

      // Get total sessions joined
      const { count: sessionsJoined } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved');

      // Get ratings data
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('rated_user_id', user.id);

      const totalRatings = ratingsData?.length || 0;
      const avgRating = totalRatings > 0
        ? ratingsData!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at, favorite_sports')
        .eq('id', user.id)
        .single();

      // Get upcoming sessions
      const now = new Date().toISOString();
      const { count: upcoming } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .gte('session_date', now);

      // Get completed sessions (past sessions)
      const { count: completed } = await supabase
        .from('sport_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .lt('session_date', now);

      // Get chat messages count
      const { count: chatMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Parse favorite sport
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>İstatistikler yüklenemedi</Text>
      </View>
    );
  }

  const StatItem = ({ icon, label, value, color = '#6200ee' }: {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon as any} size={32} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Genel İstatistikler</Text>

          <StatItem
            icon="calendar-plus"
            label="Oluşturulan Seanslar"
            value={stats.totalSessionsCreated}
            color="#4CAF50"
          />
          <Divider style={styles.divider} />

          <StatItem
            icon="account-group"
            label="Katılınan Seanslar"
            value={stats.totalSessionsJoined}
            color="#2196F3"
          />
          <Divider style={styles.divider} />

          <StatItem
            icon="calendar-clock"
            label="Yaklaşan Seanslar"
            value={stats.upcomingSessions}
            color="#FF9800"
          />
          <Divider style={styles.divider} />

          <StatItem
            icon="calendar-check"
            label="Tamamlanan Seanslar"
            value={stats.completedSessions}
            color="#9C27B0"
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Değerlendirmeler</Text>

          <StatItem
            icon="star"
            label="Ortalama Puan"
            value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
            color="#FFD700"
          />
          <Divider style={styles.divider} />

          <StatItem
            icon="star-box-multiple"
            label="Toplam Değerlendirme"
            value={stats.totalRatingsReceived}
            color="#FFC107"
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Aktivite</Text>

          <StatItem
            icon="message-text"
            label="Gönderilen Mesajlar"
            value={stats.totalChatMessages}
            color="#00BCD4"
          />
          <Divider style={styles.divider} />

          {stats.favoriteSport && (
            <>
              <StatItem
                icon="trophy"
                label="Favori Spor"
                value={stats.favoriteSport}
                color="#E91E63"
              />
              <Divider style={styles.divider} />
            </>
          )}

          <StatItem
            icon="calendar-account"
            label="Üyelik Tarihi"
            value={format(new Date(stats.memberSince), 'dd MMMM yyyy', { locale: getDateLocale() })}
            color="#607D8B"
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Toplam Aktivite</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {stats.totalSessionsCreated + stats.totalSessionsJoined}
              </Text>
              <Text style={styles.summaryLabel}>Toplam Seans</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {stats.totalChatMessages}
              </Text>
              <Text style={styles.summaryLabel}>Mesaj</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {stats.totalRatingsReceived}
              </Text>
              <Text style={styles.summaryLabel}>Değerlendirme</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
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
  card: {
    margin: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statContent: {
    marginLeft: 15,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});
