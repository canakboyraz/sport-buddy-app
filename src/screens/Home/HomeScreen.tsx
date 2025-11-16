import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform, Linking, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Chip, ActivityIndicator, FAB, Badge } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession, Sport } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { calculateDistance, formatDistance } from '../../utils/distanceCalculator';
import AdvancedFiltersModal, { AdvancedFilters } from '../../components/AdvancedFiltersModal';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// Spor türlerine göre simge eşleştirme
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

export default function HomeScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SportSession[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    maxDistance: null,
    dateFrom: null,
    dateTo: null,
    onlyAvailable: false,
    skillLevel: null,
  });

  useEffect(() => {
    loadSports();
    loadCities();
    loadSessions();
    getUserLocation();
  }, [selectedSport, selectedCity]);

  useEffect(() => {
    applyAdvancedFilters();
  }, [sessions, advancedFilters, userLocation]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const applyAdvancedFilters = () => {
    let filtered = [...sessions];

    // Distance filter
    if (advancedFilters.maxDistance && userLocation) {
      filtered = filtered.filter((session) => {
        if (!session.latitude || !session.longitude) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          session.latitude,
          session.longitude
        );
        return distance <= advancedFilters.maxDistance!;
      });
    }

    // Date range filter
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= fromDate;
      });
    }

    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.session_date);
        return sessionDate <= toDate;
      });
    }

    // Skill level filter
    if (advancedFilters.skillLevel) {
      filtered = filtered.filter(
        (session) => session.skill_level === advancedFilters.skillLevel
      );
    }

    // Only available sessions filter
    if (advancedFilters.onlyAvailable) {
      filtered = filtered.filter((session) => {
        const participantCount =
          session.participants?.filter((p) => p.status === 'approved').length || 0;
        return participantCount < session.max_participants;
      });
    }

    setFilteredSessions(filtered);
  };

  const countActiveFilters = (): number => {
    let count = 0;
    if (advancedFilters.maxDistance) count++;
    if (advancedFilters.dateFrom || advancedFilters.dateTo) count++;
    if (advancedFilters.skillLevel) count++;
    if (advancedFilters.onlyAvailable) count++;
    return count;
  };

  const loadSports = async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (!error && data) {
      setSports(data);
    }
  };

  const loadCities = async () => {
    const { data, error } = await supabase
      .from('sport_sessions')
      .select('city')
      .not('city', 'is', null);

    if (!error && data) {
      const uniqueCities = [...new Set(data.map(s => s.city).filter(Boolean))] as string[];
      setCities(uniqueCities.sort());
    }
  };

  const loadSessions = async () => {
    setLoading(true);

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    let query = supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(*)
      `)
      .eq('status', 'open')
      .gte('session_date', oneHourAgo.toISOString())
      .order('session_date', { ascending: true });

    if (selectedSport) {
      query = query.eq('sport_id', selectedSport);
    }

    if (selectedCity) {
      query = query.eq('city', selectedCity);
    }

    const { data, error } = await query;

    setLoading(false);
    setRefreshing(false);

    if (!error && data) {
      setSessions(data as any);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleLocationPress = (latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      const url = Platform.OS === 'web'
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${latitude},${longitude}`
        : `geo:${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const renderSessionCard = ({ item }: { item: SportSession }) => {
    const participantCount = item.participants?.filter(p => p.status === 'approved').length || 0;
    const isFull = participantCount >= item.max_participants;
    const sportIcon = getSportIcon(item.sport?.name || '');

    // Calculate distance if user location is available
    let distance: number | null = null;
    if (userLocation && item.latitude && item.longitude) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.latitude,
        item.longitude
      );
    }

    return (
      <Card style={styles.card} mode="elevated" onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={styles.cardHeaderRight}>
              {distance !== null && (
                <Chip icon="map-marker-distance" style={styles.distanceChip} compact textStyle={styles.distanceText}>
                  {formatDistance(distance)}
                </Chip>
              )}
              <Chip icon="account-multiple" style={styles.chip} compact>
                {participantCount}/{item.max_participants}
              </Chip>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name={sportIcon as any} size={18} color="#6200ee" />
            <Text style={styles.sport}>{item.sport?.name}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={(e) => {
              e.stopPropagation();
              handleLocationPress(item.latitude || undefined, item.longitude || undefined);
            }}
            disabled={!item.latitude || !item.longitude}
          >
            <MaterialCommunityIcons name="map-marker" size={18} color="#6200ee" />
            <Text style={[styles.location, (item.latitude && item.longitude) && styles.linkText]} numberOfLines={1}>
              {item.location}
            </Text>
            {item.latitude && item.longitude && (
              <MaterialCommunityIcons name="open-in-new" size={14} color="#6200ee" style={styles.openIcon} />
            )}
          </TouchableOpacity>

          {item.city && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="city" size={18} color="#6200ee" />
              <Text style={styles.city}>{item.city}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#6200ee" />
            <Text style={styles.date}>
              {format(new Date(item.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="star" size={18} color="#6200ee" />
            <Text style={styles.skillLevel}>{item.skill_level}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color="#6200ee" />
            <Text style={styles.creator}>{item.creator?.full_name}</Text>
          </View>

          {isFull && (
            <Chip icon="close-circle" style={styles.fullChip} textStyle={styles.fullChipText} compact>
              Dolu
            </Chip>
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

  const activeFilterCount = countActiveFilters();

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Spor Türü:</Text>
        <FlatList
          horizontal
          data={[{ id: null, name: 'Tümü', icon: 'trophy' }, ...sports.map(s => ({ ...s, icon: s.icon || getSportIcon(s.name) }))]}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Chip
              selected={selectedSport === item.id}
              onPress={() => setSelectedSport(item.id)}
              style={styles.filterChip}
              icon={item.id === null ? 'trophy' : getSportIcon(item.name)}
            >
              {item.name}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
        />

        <Text style={styles.filterTitle}>Şehir:</Text>
        <FlatList
          horizontal
          data={[{ value: null, label: 'Tümü' }, ...cities.map(c => ({ value: c, label: c }))]}
          keyExtractor={(item) => String(item.value || 'all')}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCity === item.value}
              onPress={() => setSelectedCity(item.value)}
              style={styles.filterChip}
            >
              {item.label}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        data={filteredSessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="filter-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeFilterCount > 0 ? 'Filtrelerinize uygun seans bulunamadı' : 'Henüz seans yok'}
            </Text>
            {activeFilterCount > 0 && (
              <Text style={styles.emptySubtext}>Filtreleri sıfırlayıp tekrar deneyin</Text>
            )}
          </View>
        }
      />

      <FAB
        icon={activeFilterCount > 0 ? 'filter-check' : 'filter-variant'}
        style={styles.fab}
        onPress={() => setShowAdvancedFilters(true)}
        label="Filtreler"
        color="#fff"
      />

      {activeFilterCount > 0 && (
        <Badge style={styles.filterBadge}>{activeFilterCount}</Badge>
      )}

      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        onDismiss={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onApply={setAdvancedFilters}
        hasLocation={userLocation !== null}
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 5,
    color: '#333',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 5,
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  chip: {
    marginLeft: 0,
  },
  distanceChip: {
    backgroundColor: '#e3f2fd',
  },
  distanceText: {
    color: '#1976d2',
    fontSize: 11,
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
  linkText: {
    color: '#6200ee',
    textDecorationLine: 'underline',
  },
  openIcon: {
    marginLeft: 5,
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6200ee',
  },
  filterBadge: {
    position: 'absolute',
    bottom: 70,
    right: 30,
    backgroundColor: '#F44336',
  },
});
