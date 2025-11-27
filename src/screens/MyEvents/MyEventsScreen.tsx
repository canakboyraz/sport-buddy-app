import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSkillLevelLabel } from '../../utils/skillLevelUtils';
import { useTranslation } from 'react-i18next';

export default function MyEventsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useFocusEffect(
    useCallback(() => {
      loadMySessions();
    }, [filter, user])
  );

  const getParticipatedSessionIds = async () => {
    if (!user?.id) return '';

    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (!error && data && data.length > 0) {
        return data.map(p => p.session_id).join(',');
      }
    } catch (error) {
      console.error('Error getting participated sessions:', error);
    }
    return '0';
  };

  const loadMySessions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const participatedIds = await getParticipatedSessionIds();

      const { data, error } = await supabase
        .from('sport_sessions')
        .select(`
          *,
          creator:profiles!sport_sessions_creator_id_fkey(
            id,
            email,
            full_name,
            phone,
            bio,
            avatar_url,
            created_at,
            average_rating,
            total_ratings,
            positive_reviews_count
          ),
          sport:sports(*),
          participants:session_participants(*)
        `)
        .or(`creator_id.eq.${user.id},id.in.(${participatedIds})`)
        .order('session_date', { ascending: filter === 'upcoming' });

      if (!error && data) {
        const now = new Date();
        let filteredData = data;

        if (filter === 'upcoming') {
          filteredData = data.filter(session => new Date(session.session_date) >= now);
        } else if (filter === 'past') {
          filteredData = data.filter(session => new Date(session.session_date) < now);
        }

        setSessions(filteredData as any);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMySessions();
  };

  const renderSessionCard = ({ item }: { item: SportSession }) => {
    const participantCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isCreator = item.creator_id === user?.id;
    const isPast = new Date(item.session_date) < new Date();
    const isFull = participantCount >= item.max_participants;

    return (
      <Card style={styles.card} mode="elevated" onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}>
        {/* Gradient Header */}
        <LinearGradient
          colors={
            theme.dark
              ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
              : ['#6200ee', '#9c27b0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.participantBadge}>
              <MaterialCommunityIcons name="account-multiple" size={14} color="white" />
              <Text style={styles.participantCount}>
                {participantCount}/{item.max_participants}
              </Text>
            </View>
          </View>

          {/* Status Badges */}
          <View style={styles.badges}>
            {isCreator && (
              <View style={styles.statusBadge}>
                <MaterialCommunityIcons name="crown" size={10} color="white" />
                <Text style={styles.badgeText}>{t('myEvents.created')}</Text>
              </View>
            )}
            {!isCreator && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <MaterialCommunityIcons name="account-check" size={10} color="white" />
                <Text style={styles.badgeText}>{t('myEvents.joined')}</Text>
              </View>
            )}
            {isFull && !isPast && (
              <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
                <MaterialCommunityIcons name="close-circle" size={10} color="white" />
                <Text style={styles.badgeText}>{t('session.full')}</Text>
              </View>
            )}
            {isPast && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <MaterialCommunityIcons name="clock-outline" size={10} color="white" />
                <Text style={styles.badgeText}>{t('myEvents.past')}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Card Content */}
        <Card.Content style={styles.cardContent}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="soccer" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>{item.sport?.name}</Text>
            <Text style={[styles.skillLevel, { color: theme.colors.onSurfaceVariant }]}>• {getSkillLevelLabel(item.skill_level)}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
              {format(new Date(item.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.city ? `${item.city} - ${item.location}` : item.location}
            </Text>
          </View>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as 'upcoming' | 'past')}
          buttons={[
            { value: 'upcoming', label: t('myEvents.upcoming') },
            { value: 'past', label: t('myEvents.past') },
          ]}
        />
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {filter === 'upcoming' ? t('myEvents.noUpcomingEvents') : t('myEvents.noPastEvents')}
            </Text>
          </View>
        }
      />
    </View>
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
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  list: {
    padding: 8,
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientHeader: {
    padding: 10,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    flex: 1,
    marginRight: 8,
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  participantCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  skillLevel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
