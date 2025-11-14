import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Modal, Portal, Button, Text } from 'react-native-paper';
import * as Location from 'expo-location';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

interface MapPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onLocationSelect: (latitude: number, longitude: number, address: string, city: string) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export default function MapPicker({
  visible,
  onDismiss,
  onLocationSelect,
  initialLatitude,
  initialLongitude,
}: MapPickerProps) {
  const [region, setRegion] = useState({
    latitude: initialLatitude || 41.0082,
    longitude: initialLongitude || 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );

  useEffect(() => {
    if (visible && !initialLatitude && !initialLongitude) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    setRegion(newRegion);
    setSelectedLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleConfirm = async () => {
    if (!selectedLocation) return;

    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const address = `${addr.street || ''}, ${addr.district || ''}, ${addr.city || ''}`;
        const city = addr.city || '';
        onLocationSelect(selectedLocation.latitude, selectedLocation.longitude, address, city);
      } else {
        onLocationSelect(selectedLocation.latitude, selectedLocation.longitude, 'Seçilen konum', '');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      onLocationSelect(selectedLocation.latitude, selectedLocation.longitude, 'Seçilen konum', '');
    }
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.container}>
          <Text style={styles.title}>Konum Seç</Text>
          <Text style={styles.subtitle}>Haritaya dokunarak konum seçin</Text>

          {MapView && (
            <MapView
              style={styles.map}
              region={region}
              onPress={handleMapPress}
            >
              {selectedLocation && Marker && (
                <Marker coordinate={selectedLocation} />
              )}
            </MapView>
          )}

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={onDismiss} style={styles.button}>
              İptal
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={styles.button}
              disabled={!selectedLocation}
            >
              Onayla
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  map: {
    height: 400,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});
