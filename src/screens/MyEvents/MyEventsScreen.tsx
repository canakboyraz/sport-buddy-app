import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons, Badge } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MyEventsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: MyEventsScreenNavigationProp;
};

export default function MyEventsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadMySessions();
  }, [filter]);

  const getParticipatedSessionIds = async () => {
    if (!user?.id) return '';

    const { data, error } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (!error && data && data.length > 0) {
      return data.map(p => p.session_id).join(',');
    }
    return '0';
  };

  const loadMySessions = async () => {
    if (!user?.id) return;

    setLoading(true);

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

    setLoading(false);
    setRefreshing(false);

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
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Chip icon="account-multiple" style={styles.chip} compact>
              {participantCount}/{item.max_participants}
            </Chip>
          </View>

          <View style={styles.badges}>
            {isCreator && (
              <Chip icon="crown" style={styles.creatorChip} textStyle={styles.creatorChipText} compact>
                Oluşturduğum
              </Chip>
            )}
            {!isCreator && (
              <Chip icon="account-check" style={styles.participantChip} textStyle={styles.participantChipText} compact>
                Katıldığım
              </Chip>
            )}
            {isFull && !isPast && (
              <Chip icon="close-circle" style={styles.fullChip} textStyle={styles.fullChipText} compact>
                Dolu
              </Chip>
            )}
            {isPast && (
              <Chip icon="clock-outline" style={styles.pastChip} textStyle={styles.pastChipText} compact>
                Geçmiş
              </Chip>
            )}
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="soccer" size={18} color="#6200ee" />
            <Text style={styles.infoText}>{item.sport?.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#6200ee" />
            <Text style={styles.infoText}>
              {format(new Date(item.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#6200ee" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.city ? `${item.city} - ${item.location}` : item.location}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star" size={18} color="#6200ee" />
            <Text style={styles.infoText}>
              {item.skill_level} • {item.status}
            </Text>
          </View>
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

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  list: {
    padding: 10,
  },
  card: {
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
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
    marginBottom: 10,
    gap: 6,
  },
  creatorChip: {
    backgroundColor: '#FFD700',
  },
  creatorChipText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  participantChip: {
    backgroundColor: '#4CAF50',
  },
  participantChipText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fullChip: {
    backgroundColor: '#F44336',
  },
  fullChipText: {
    color: '#FFF',
    fontSize: 12,
  },
  pastChip: {
    backgroundColor: '#9E9E9E',
  },
  pastChipText: {
    color: '#FFF',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
