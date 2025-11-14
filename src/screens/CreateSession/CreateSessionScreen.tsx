import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { TextInput, Button, Menu, Text, Portal, Modal, Dialog } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Sport } from '../../types';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapPicker from '../../components/MapPicker';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .order('name');

      if (!error && data) {
        setSports(data);
      } else if (error) {
        console.error('Error loading sports:', error);
        Alert.alert('Hata', 'Sporlar yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error in loadSports:', error);
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
          if (event.type === 'set' && selectedDate) {
            setSessionDate(selectedDate);
            showTimePicker();
          }
        },
        mode: 'date',
        is24Hour: true,
      });
    } else {
      setDatePickerMode('date');
      setShowDatePickerModal(true);
    }
  };

  const showTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: sessionDate,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setSessionDate(selectedDate);
          }
        },
        mode: 'time',
        is24Hour: true,
      });
    } else {
      setDatePickerMode('time');
      setShowTimePickerModal(true);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'android') {
      if (selectedDate) {
        setSessionDate(selectedDate);
      }
    }
  };

  const handleDatePickerConfirm = () => {
    setShowDatePickerModal(false);
    if (Platform.OS !== 'android') {
      // Auto-show time picker after date on iOS/web
      setTimeout(() => showTimePicker(), 300);
    }
  };

  const handleTimePickerConfirm = () => {
    setShowTimePickerModal(false);
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

    // Validate max participants
    const maxParticipantsNum = parseInt(maxParticipants);
    if (isNaN(maxParticipantsNum) || maxParticipantsNum < 2) {
      Alert.alert('Hata', 'Maksimum katılımcı sayısı en az 2 olmalıdır');
      return;
    }

    // Validate session date is in the future
    if (sessionDate <= new Date()) {
      Alert.alert('Hata', 'Etkinlik tarihi gelecekte olmalıdır');
      return;
    }

    setLoading(true);

    try {
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
        max_participants: maxParticipantsNum,
        skill_level: skillLevel as any,
        status: 'open',
      }).select();

      setLoading(false);

      if (error) {
        console.error('Error creating session:', error);
        Alert.alert('Hata', error.message);
      } else {
        Alert.alert('Başarılı', 'Seans oluşturuldu!', [
          {
            text: 'Tamam',
            onPress: () => {
              // Reset form
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
              // Navigate to My Events
              navigation.navigate('MyEvents');
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error in handleCreate:', error);
      setLoading(false);
      Alert.alert('Hata', 'Seans oluşturulurken bir hata oluştu');
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
          {format(sessionDate, 'dd MMM yyyy, HH:mm', { locale: tr })}
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

      {/* Date Picker Modal for iOS/Web */}
      {Platform.OS !== 'android' && showDatePickerModal && (
        <Portal>
          <Modal
            visible={showDatePickerModal}
            onDismiss={() => setShowDatePickerModal(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.datePickerContainer}>
              <Text style={styles.modalTitle}>Tarih Seç</Text>
              <DateTimePicker
                value={sessionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                locale="tr-TR"
              />
              <View style={styles.modalButtons}>
                <Button onPress={() => setShowDatePickerModal(false)} style={styles.modalButton}>
                  İptal
                </Button>
                <Button mode="contained" onPress={handleDatePickerConfirm} style={styles.modalButton}>
                  Tamam
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      )}

      {/* Time Picker Modal for iOS/Web */}
      {Platform.OS !== 'android' && showTimePickerModal && (
        <Portal>
          <Modal
            visible={showTimePickerModal}
            onDismiss={() => setShowTimePickerModal(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.datePickerContainer}>
              <Text style={styles.modalTitle}>Saat Seç</Text>
              <DateTimePicker
                value={sessionDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                locale="tr-TR"
                is24Hour={true}
              />
              <View style={styles.modalButtons}>
                <Button onPress={() => setShowTimePickerModal(false)} style={styles.modalButton}>
                  İptal
                </Button>
                <Button mode="contained" onPress={handleTimePickerConfirm} style={styles.modalButton}>
                  Tamam
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      )}
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
  modalContainer: {
    margin: 20,
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});
