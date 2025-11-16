import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { getUserFavorites, getUserSavedSessions } from '../../services/favoritesService';
import { useAuth } from '../../hooks/useAuth';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: FavoritesScreenNavigationProp;
};

const getSportIcon = (sportName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Futbol': 'soccer',
    'Basketbol': 'basketball',
    'Tenis': 'tennis',
    'Voleybol': 'volleyball',
    'Yüzme': 'swim',
    'Koşu': 'run',
    'Bisiklet': 'bike',
  };
  return iconMap[sportName] || 'trophy';
};

export default function FavoritesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    if (activeTab === 'favorites') {
      const result = await getUserFavorites(user.id);
      if (result.success && result.data) {
        setFavorites(result.data);
      }
    } else {
      const result = await getUserSavedSessions(user.id);
      if (result.success && result.data) {
        setSavedSessions(result.data);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderSessionCard = ({ item }: { item: any }) => {
    const session: SportSession = item.session;
    if (!session) return null;

    const participantCount = session.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantCount >= session.max_participants;
    const sportIcon = getSportIcon(session.sport?.name || '');

    return (
      <Card
        style={styles.card}
        mode="elevated"
        onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
            <Chip icon="account-multiple" style={styles.chip} compact>
              {participantCount}/{session.max_participants}
            </Chip>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name={sportIcon as any} size={18} color="#6200ee" />
            <Text style={styles.sport}>{session.sport?.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#6200ee" />
            <Text style={styles.location} numberOfLines={1}>{session.location}</Text>
          </View>

          {session.city && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="city" size={18} color="#6200ee" />
              <Text style={styles.city}>{session.city}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#6200ee" />
            <Text style={styles.date}>
              {format(new Date(session.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star" size={18} color="#6200ee" />
            <Text style={styles.skillLevel}>{session.skill_level}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color="#6200ee" />
            <Text style={styles.creator}>{session.creator?.full_name}</Text>
          </View>

          {activeTab === 'saved' && item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Not:</Text>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}

          {isFull && (
            <Chip icon="close-circle" style={styles.fullChip} textStyle={styles.fullChipText} compact>
              Dolu
            </Chip>
          )}

          <View style={styles.dateAddedContainer}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
            <Text style={styles.dateAdded}>
              {activeTab === 'favorites' ? 'Favorilere eklendi: ' : 'Kaydedildi: '}
              {format(new Date(item.created_at), 'dd MMM yyyy', { locale: tr })}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const data = activeTab === 'favorites' ? favorites : savedSessions;

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'favorites',
              label: 'Favoriler',
              icon: 'heart',
            },
            {
              value: 'saved',
              label: 'Kayıtlı',
              icon: 'bookmark',
            },
          ]}
        />
      </View>

      <FlatList
        data={data}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name={activeTab === 'favorites' ? 'heart-outline' : 'bookmark-outline'}
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyText}>
              {activeTab === 'favorites'
                ? 'Henüz favori eklemediniz'
                : 'Henüz kayıtlı seans yok'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'favorites'
                ? 'Beğendiğiniz seansları favorilere ekleyebilirsiniz'
                : 'İlgilendiğiniz seansları kayıt edebilirsiniz'}
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
  tabContainer: {
    backgroundColor: '#fff',
    padding: 10,
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
    marginBottom: 10,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sport: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  location: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  city: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  date: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  skillLevel: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  creator: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff9e6',
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#333',
  },
  fullChip: {
    backgroundColor: '#F44336',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  fullChipText: {
    color: '#FFF',
    fontSize: 12,
  },
  dateAddedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  dateAdded: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});
