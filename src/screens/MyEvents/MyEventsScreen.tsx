import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, useTheme } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function MyEventsScreen({ navigation }: any) {
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
          creator:profiles!sport_sessions_creator_id_fkey(*),
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
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.title}</Text>
            <Chip icon="account-multiple" style={styles.chip} compact>
              {participantCount}/{item.max_participants}
            </Chip>
          </View>

          <View style={styles.badges}>
            {isCreator && (
              <Chip icon="crown" style={[styles.creatorChip, { backgroundColor: theme.colors.primaryContainer }]} textStyle={[styles.creatorChipText, { color: theme.colors.onPrimaryContainer }]} compact>
                Oluşturduğum
              </Chip>
            )}
            {!isCreator && (
              <Chip icon="account-check" style={[styles.participantChip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={[styles.participantChipText, { color: theme.colors.onSecondaryContainer }]} compact>
                Katıldığım
              </Chip>
            )}
            {isFull && !isPast && (
              <Chip icon="close-circle" style={[styles.fullChip, { backgroundColor: theme.colors.errorContainer }]} textStyle={[styles.fullChipText, { color: theme.colors.onErrorContainer }]} compact>
                Dolu
              </Chip>
            )}
            {isPast && (
              <Chip icon="clock-outline" style={[styles.pastChip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={[styles.pastChipText, { color: theme.colors.onSurfaceVariant }]} compact>
                Geçmiş
              </Chip>
            )}
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="soccer" size={18} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>{item.sport?.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              {format(new Date(item.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {item.city ? `${item.city} - ${item.location}` : item.location}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star" size={18} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              {item.skill_level} • {item.status}
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
            { value: 'upcoming', label: 'Yaklaşan' },
            { value: 'past', label: 'Geçmiş' },
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
              {filter === 'upcoming' ? 'Yaklaşan etkinlik yok' : 'Geçmiş etkinlik yok'}
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  chip: {
    marginLeft: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 5,
  },
  creatorChip: {
  },
  creatorChipText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  participantChip: {
  },
  participantChipText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  fullChip: {
  },
  fullChipText: {
    fontSize: 12,
  },
  pastChip: {
  },
  pastChipText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
