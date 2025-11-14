import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { TextInput, Button, Menu, Text } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Sport } from '../../types';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapPicker from '../../components/MapPicker';
import { useAuth } from '../../hooks/useAuth';

export default function CreateSessionScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [sportMenuVisible, setSportMenuVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date());
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [skillLevel, setSkillLevel] = useState('any');
  const [skillMenuVisible, setSkillMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (!error && data) {
      setSports(data);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Konum izni verilmedi');
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    const addresses = await Location.reverseGeocodeAsync({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });

    if (addresses.length > 0) {
      const addr = addresses[0];
      const fullAddress = `${addr.street || ''}, ${addr.district || ''}, ${addr.city || ''}`;
      setLocation(fullAddress);
      setCity(addr.city || '');
      setLatitude(currentLocation.coords.latitude);
      setLongitude(currentLocation.coords.longitude);
    }
  };

  const showDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: sessionDate,
        onChange: (event, selectedDate) => {
          if (selectedDate) {
            setSessionDate(selectedDate);
            showTimePicker();
          }
        },
        mode: 'date',
        is24Hour: true,
      });
    }
  };

  const showTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: sessionDate,
        onChange: (event, selectedDate) => {
          if (selectedDate) {
            setSessionDate(selectedDate);
          }
        },
        mode: 'time',
        is24Hour: true,
      });
    }
  };

  const handleCreate = async () => {
    if (!selectedSport || !title || !location || !maxParticipants) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.from('sport_sessions').insert({
      creator_id: user.id,
      sport_id: selectedSport,
      title,
      description: description || null,
      location,
      city: city || null,
      latitude,
      longitude,
      session_date: sessionDate.toISOString(),
      max_participants: parseInt(maxParticipants),
      skill_level: skillLevel as any,
      status: 'open',
    }).select();

    setLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Seans oluşturuldu!');
      setTitle('');
      setDescription('');
      setLocation('');
      setCity('');
      setLatitude(null);
      setLongitude(null);
      setSelectedSport(null);
      setMaxParticipants('10');
      setSkillLevel('any');
      setSessionDate(new Date());
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Menu
          visible={sportMenuVisible}
          onDismiss={() => setSportMenuVisible(false)}
          anchor={
            <TextInput
              label="Spor Türü *"
              value={sports.find(s => s.id === selectedSport)?.name || ''}
              mode="outlined"
              style={styles.input}
              editable={false}
              right={<TextInput.Icon icon="chevron-down" onPress={() => setSportMenuVisible(true)} />}
              onPressIn={() => setSportMenuVisible(true)}
            />
          }
        >
          {sports.map((sport) => (
            <Menu.Item
              key={sport.id}
              onPress={() => {
                setSelectedSport(sport.id);
                setSportMenuVisible(false);
              }}
              title={sport.name}
            />
          ))}
        </Menu>

        <TextInput
          label="Başlık *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          label="Konum *"
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          style={styles.input}
          right={
            <>
              <TextInput.Icon
                icon="crosshairs-gps"
                onPress={getCurrentLocation}
              />
              <TextInput.Icon
                icon="map"
                onPress={() => setMapVisible(true)}
              />
            </>
          }
        />

        <MapPicker
          visible={mapVisible}
          onDismiss={() => setMapVisible(false)}
          onLocationSelect={(lat, lng, address, cityName) => {
            setLatitude(lat);
            setLongitude(lng);
            setLocation(address);
            setCity(cityName);
            setMapVisible(false);
          }}
          initialLatitude={latitude || undefined}
          initialLongitude={longitude || undefined}
        />

        <Button
          mode="outlined"
          onPress={showDatePicker}
          style={styles.input}
          icon="calendar"
        >
          {sessionDate.toLocaleString('tr-TR')}
        </Button>

        <TextInput
          label="Maksimum Katılımcı *"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />

        <Menu
          visible={skillMenuVisible}
          onDismiss={() => setSkillMenuVisible(false)}
          anchor={
            <TextInput
              label="Seviye"
              value={skillLevel}
              mode="outlined"
              style={styles.input}
              editable={false}
              right={<TextInput.Icon icon="chevron-down" onPress={() => setSkillMenuVisible(true)} />}
              onPressIn={() => setSkillMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={() => { setSkillLevel('any'); setSkillMenuVisible(false); }} title="any" />
          <Menu.Item onPress={() => { setSkillLevel('beginner'); setSkillMenuVisible(false); }} title="beginner" />
          <Menu.Item onPress={() => { setSkillLevel('intermediate'); setSkillMenuVisible(false); }} title="intermediate" />
          <Menu.Item onPress={() => { setSkillLevel('advanced'); setSkillMenuVisible(false); }} title="advanced" />
        </Menu>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Seans Oluştur
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
});
