import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ActivityIndicator, FAB, Portal, Modal, Card, Text, Button, Chip } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { SportSession } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MapViewScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  navigation: MapViewScreenNavigationProp;
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

export default function MapViewScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SportSession | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [region, setRegion] = useState({
    latitude: 41.0082, // Istanbul default
    longitude: 28.9784,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  useEffect(() => {
    getUserLocation();
    loadSessions();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        });
      }
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
  };

  const loadSessions = async () => {
    setLoading(true);

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data, error } = await supabase
      .from('sport_sessions')
      .select(`
        *,
        creator:profiles!sport_sessions_creator_id_fkey(*),
        sport:sports(*),
        participants:session_participants(*)
      `)
      .eq('status', 'open')
      .gte('session_date', oneHourAgo.toISOString())
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('session_date', { ascending: true });

    setLoading(false);

    if (!error && data) {
      setSessions(data as any);
    }
  };

  const handleMarkerPress = (session: SportSession) => {
    setSelectedSession(session);
    setModalVisible(true);
  };

  const handleRefresh = () => {
    loadSessions();
  };

  const handleMyLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
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
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {sessions.map((session) => {
          if (!session.latitude || !session.longitude) return null;

          const participantCount = session.participants?.filter(p => p.status === 'approved').length || 0;
          const isFull = participantCount >= session.max_participants;

          return (
            <Marker
              key={session.id}
              coordinate={{
                latitude: session.latitude,
                longitude: session.longitude,
              }}
              onPress={() => handleMarkerPress(session)}
              pinColor={isFull ? '#F44336' : '#6200ee'}
            >
              <View style={styles.markerContainer}>
                <MaterialCommunityIcons
                  name={getSportIcon(session.sport?.name || '') as any}
                  size={24}
                  color={isFull ? '#F44336' : '#6200ee'}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <FAB
        style={[styles.fab, styles.fabRefresh]}
        small
        icon="refresh"
        onPress={handleRefresh}
      />

      <FAB
        style={[styles.fab, styles.fabLocation]}
        small
        icon="crosshairs-gps"
        onPress={handleMyLocation}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedSession && (
            <Card>
              <Card.Content>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedSession.title}
                  </Text>
                  <Chip icon="account-multiple" compact>
                    {selectedSession.participants?.filter(p => p.status === 'approved').length || 0}/
                    {selectedSession.max_participants}
                  </Chip>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name={getSportIcon(selectedSession.sport?.name || '') as any}
                    size={18}
                    color="#6200ee"
                  />
                  <Text style={styles.infoText}>{selectedSession.sport?.name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="map-marker" size={18} color="#6200ee" />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {selectedSession.location}
                  </Text>
                </View>

                {selectedSession.city && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="city" size={18} color="#6200ee" />
                    <Text style={styles.infoText}>{selectedSession.city}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar" size={18} color="#6200ee" />
                  <Text style={styles.infoText}>
                    {format(new Date(selectedSession.session_date), 'dd MMM yyyy, HH:mm', { locale: tr })}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="star" size={18} color="#6200ee" />
                  <Text style={styles.infoText}>{selectedSession.skill_level}</Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account" size={18} color="#6200ee" />
                  <Text style={styles.infoText}>{selectedSession.creator?.full_name}</Text>
                </View>

                {selectedSession.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Açıklama:</Text>
                    <Text style={styles.descriptionText} numberOfLines={3}>
                      {selectedSession.description}
                    </Text>
                  </View>
                )}
              </Card.Content>

              <Card.Actions>
                <Button onPress={() => setModalVisible(false)}>Kapat</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('SessionDetail', { sessionId: selectedSession.id });
                  }}
                >
                  Detay
                </Button>
              </Card.Actions>
            </Card>
          )}
        </Modal>
      </Portal>
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
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  fab: {
    position: 'absolute',
    right: 16,
  },
  fabRefresh: {
    bottom: 90,
  },
  fabLocation: {
    bottom: 30,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
  },
});
