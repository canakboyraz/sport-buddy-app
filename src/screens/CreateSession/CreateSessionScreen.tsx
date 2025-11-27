import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { TextInput, Button, Menu, Text, Portal, Modal, Dialog, Switch, Chip, useTheme, List } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Sport } from '../../types';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapPicker from '../../components/MapPicker';
import WeatherCard from '../../components/WeatherCard';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import {
  validateSessionTitle,
  validateSessionDescription,
  validateMaxParticipants,
  validateLocation,
  validateCoordinates
} from '../../utils/validation';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../../utils/dateLocale';

// Spor türlerine göre simge eşleştirme
const getSportIcon = (sportName: string): string => {
  const iconMap: { [key: string]: string } = {
    // Takım Sporları
    'Futbol': 'soccer',
    'Basketbol': 'basketball',
    'Voleybol': 'volleyball',
    'Hentbol': 'handball',
    'Rugby': 'rugby',
    'Beyzbol': 'baseball',

    // Raket Sporları
    'Tenis': 'tennis',
    'Badminton': 'badminton',
    'Masa Tenisi': 'table-tennis',
    'Squash': 'racquetball',

    // Su Sporları
    'Yüzme': 'swim',
    'Su Topu': 'water',
    'Sörf': 'surfing',

    // Bireysel Sporlar
    'Koşu': 'run',
    'Bisiklet': 'bike',
    'Yürüyüş': 'walk',
    'Atletizm': 'run',

    // Fitness & Gym
    'Gym': 'weight-lifter',
    'Fitness': 'dumbbell',
    'CrossFit': 'run-fast',
    'Yoga': 'yoga',
    'Pilates': 'pilates',

    // Dövüş Sanatları
    'Boks': 'boxing-glove',
    'Dövüş Sanatları': 'karate',
    'Kickboks': 'kickboxing',
    'Judo': 'judo',
    'Taekwondo': 'taekwondo',
    'Güreş': 'wrestling',
    'Eskrim': 'fencing',

    // Dans ve Hareket
    'Dans': 'dance-ballroom',
    'Zumba': 'music',
    'Jimnastik': 'gymnastics',

    // Kış Sporları
    'Kayak': 'ski',
    'Snowboard': 'snowboard',
    'Paten': 'rollerblade',

    // Outdoor
    'Dağ Tırmanışı': 'image-filter-hdr',
    'Kaya Tırmanışı': 'climbing',
    'Golf': 'golf',

    // Diğer
    'Triatlon': 'triathlon',
  };
  return iconMap[sportName] || 'trophy';
};

export default function CreateSessionScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
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

  // Recurring session states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceMenuVisible, setRecurrenceMenuVisible] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState<number>(0); // 0-6 for days of week, 1-31 for day of month
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
        Alert.alert(t('common.error'), t('createSession.errors.loadSportsFailed'));
      }
    } catch (error) {
      console.error('Error in loadSports:', error);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('map.locationPermissionRequired'), t('map.locationPermissionDenied'));
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
    // Validate required fields
    if (!selectedSport || !title || !location || !maxParticipants) {
      Alert.alert(t('common.error'), t('createSession.errors.fillRequired'));
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), t('createSession.errors.userNotFound'));
      return;
    }

    // Validate title
    const titleValidation = validateSessionTitle(title);
    if (!titleValidation.isValid) {
      Alert.alert(t('common.error'), titleValidation.message);
      return;
    }

    // Validate description
    if (description) {
      const descValidation = validateSessionDescription(description);
      if (!descValidation.isValid) {
        Alert.alert(t('common.error'), descValidation.message);
        return;
      }
    }

    // Validate location
    const locationValidation = validateLocation(location);
    if (!locationValidation.isValid) {
      Alert.alert(t('common.error'), locationValidation.message);
      return;
    }

    // Validate coordinates if provided
    if (latitude !== null && longitude !== null) {
      const coordValidation = validateCoordinates(latitude, longitude);
      if (!coordValidation.isValid) {
        Alert.alert(t('common.error'), coordValidation.message);
        return;
      }
    }

    // Validate max participants
    const maxParticipantsNum = parseInt(maxParticipants);
    const participantsValidation = validateMaxParticipants(maxParticipantsNum);
    if (!participantsValidation.isValid) {
      Alert.alert(t('common.error'), participantsValidation.message);
      return;
    }

    // Validate session date is in the future
    if (sessionDate <= new Date()) {
      Alert.alert(t('common.error'), t('createSession.errors.dateMustBeFuture'));
      return;
    }

    setLoading(true);

    try {
      if (isRecurring) {
        // Create recurring session template
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_sessions')
          .insert({
            creator_id: user.id,
            sport_id: selectedSport,
            title,
            description: description || null,
            location,
            city: city || null,
            latitude,
            longitude,
            start_time: format(sessionDate, 'HH:mm:ss'),
            duration_minutes: 60,
            max_participants: maxParticipantsNum,
            skill_level: skillLevel as any,
            recurrence_type: recurrenceType,
            recurrence_day: recurrenceDay,
            start_date: format(sessionDate, 'yyyy-MM-dd'),
            end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
            is_active: true,
          })
          .select()
          .single();

        if (recurringError) {
          console.error('Error creating recurring session:', recurringError);
          Alert.alert(t('common.error'), recurringError.message);
          setLoading(false);
          return;
        }

        // Generate sessions for the next 30 days
        const { data: generatedSessions, error: generateError } = await supabase.rpc(
          'generate_recurring_sessions',
          {
            p_recurring_id: recurringData.id,
            p_days_ahead: 30,
          }
        );

        setLoading(false);

        if (generateError) {
          console.error('Error generating sessions:', generateError);
          Alert.alert(t('createSession.warning'), t('createSession.recurringCreatedButGenerateFailed'));
        } else {
          const sessionCount = generatedSessions?.length || 0;
          Alert.alert(
            t('common.success'),
            t('createSession.recurringCreatedSuccess', { count: sessionCount }),
            [
              {
                text: t('common.ok'),
                onPress: resetForm,
              },
            ]
          );
        }
      } else {
        // Create single session
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
          Alert.alert(t('common.error'), error.message);
        } else {
          Alert.alert(t('common.success'), t('session.createSuccess'), [
            {
              text: t('common.ok'),
              onPress: resetForm,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error in handleCreate:', error);
      setLoading(false);
      Alert.alert(t('common.error'), t('createSession.errors.createFailed'));
    }
  };

  const resetForm = () => {
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
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceDay(0);
    setEndDate(null);
    navigation.navigate('MyEvents');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.form}>
        <TextInput
          label={t('createSession.sportType') + ' *'}
          value={sports.find(s => s.id === selectedSport)?.name || ''}
          mode="outlined"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          editable={false}
          right={<TextInput.Icon icon="chevron-down" onPress={() => setSportMenuVisible(true)} />}
          onPressIn={() => setSportMenuVisible(true)}
        />

        {/* Sport Selection Dialog */}
        <Portal>
          <Dialog
            visible={sportMenuVisible}
            onDismiss={() => setSportMenuVisible(false)}
            style={[styles.sportDialog, { backgroundColor: theme.colors.surface }]}
          >
            <Dialog.Title style={{ color: theme.colors.onSurface }}>{t('createSession.selectSport')}</Dialog.Title>
            <Dialog.ScrollArea style={styles.dialogScrollArea}>
              <ScrollView>
                {sports.map((sport) => (
                  <List.Item
                    key={sport.id}
                    title={sport.name}
                    onPress={() => {
                      setSelectedSport(sport.id);
                      setSportMenuVisible(false);
                    }}
                    left={props => <List.Icon {...props} icon={getSportIcon(sport.name)} color={theme.colors.primary} />}
                    style={selectedSport === sport.id ? { backgroundColor: theme.colors.primaryContainer } : {}}
                    titleStyle={{ color: selectedSport === sport.id ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
                  />
                ))}
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setSportMenuVisible(false)}>{t('common.cancel')}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <TextInput
          label={t('createSession.title') + ' *'}
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />

        <TextInput
          label={t('createSession.description')}
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />

        <TextInput
          label={t('createSession.location') + ' *'}
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          right={
            <TextInput.Icon
              icon="crosshairs-gps"
              onPress={getCurrentLocation}
            />
          }
        />

        <Button
          mode="outlined"
          onPress={() => setMapVisible(true)}
          style={styles.mapButton}
          icon="map-marker"
        >
          {t('createSession.selectFromMap')}
        </Button>

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
          {format(sessionDate, 'dd MMM yyyy, HH:mm', { locale: getDateLocale() })}
        </Button>

        {/* Weather Forecast */}
        {latitude && longitude && (
          <WeatherCard
            latitude={latitude}
            longitude={longitude}
            sessionDate={sessionDate}
            compact={false}
          />
        )}

        <TextInput
          label={t('createSession.maxParticipants') + ' *'}
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          mode="outlined"
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />

        <TextInput
          label={t('createSession.skillLevel')}
          value={
            skillLevel === 'any' ? t('skillLevel.any') :
            skillLevel === 'beginner' ? t('skillLevel.beginner') :
            skillLevel === 'intermediate' ? t('skillLevel.intermediate') :
            t('skillLevel.advanced')
          }
          mode="outlined"
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          editable={false}
          right={<TextInput.Icon icon="chevron-down" onPress={() => setSkillMenuVisible(true)} />}
          onPressIn={() => setSkillMenuVisible(true)}
        />

        {/* Skill Level Dialog */}
        <Portal>
          <Dialog
            visible={skillMenuVisible}
            onDismiss={() => setSkillMenuVisible(false)}
            style={[styles.sportDialog, { backgroundColor: theme.colors.surface }]}
          >
            <Dialog.Title style={{ color: theme.colors.onSurface }}>{t('createSession.selectSkillLevel')}</Dialog.Title>
            <Dialog.Content>
              {[
                { value: 'any', label: t('skillLevel.any') },
                { value: 'beginner', label: t('skillLevel.beginner') },
                { value: 'intermediate', label: t('skillLevel.intermediate') },
                { value: 'advanced', label: t('skillLevel.advanced') }
              ].map((skill) => (
                <List.Item
                  key={skill.value}
                  title={skill.label}
                  onPress={() => {
                    setSkillLevel(skill.value);
                    setSkillMenuVisible(false);
                  }}
                  left={props => <List.Icon {...props} icon="account-star" color={theme.colors.primary} />}
                  style={skillLevel === skill.value ? { backgroundColor: theme.colors.primaryContainer } : {}}
                  titleStyle={{ color: skillLevel === skill.value ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
                />
              ))}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setSkillMenuVisible(false)}>{t('common.cancel')}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Recurring Session Options */}
        <View style={styles.recurringContainer}>
          <View style={styles.recurringHeader}>
            <Text style={[styles.recurringLabel, { color: theme.colors.onSurface }]}>{t('createSession.recurringSession')}</Text>
            <Switch value={isRecurring} onValueChange={setIsRecurring} />
          </View>
        </View>

        {isRecurring && (
          <View style={[styles.recurringOptions, { backgroundColor: theme.colors.surfaceVariant }]}>
            <TextInput
              label={t('createSession.recurrenceFrequency')}
              value={
                recurrenceType === 'daily' ? t('createSession.frequency.daily') :
                recurrenceType === 'weekly' ? t('createSession.frequency.weekly') :
                recurrenceType === 'biweekly' ? t('createSession.frequency.biweekly') :
                t('createSession.frequency.monthly')
              }
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              editable={false}
              right={<TextInput.Icon icon="chevron-down" onPress={() => setRecurrenceMenuVisible(true)} />}
              onPressIn={() => setRecurrenceMenuVisible(true)}
            />

            {/* Recurrence Type Dialog */}
            <Portal>
              <Dialog
                visible={recurrenceMenuVisible}
                onDismiss={() => setRecurrenceMenuVisible(false)}
                style={[styles.sportDialog, { backgroundColor: theme.colors.surface }]}
              >
                <Dialog.Title style={{ color: theme.colors.onSurface }}>{t('createSession.recurrenceFrequency')}</Dialog.Title>
                <Dialog.Content>
                  {[
                    { value: 'daily', label: t('createSession.frequency.daily') },
                    { value: 'weekly', label: t('createSession.frequency.weekly') },
                    { value: 'biweekly', label: t('createSession.frequency.biweekly') },
                    { value: 'monthly', label: t('createSession.frequency.monthly') }
                  ].map((rec) => (
                    <List.Item
                      key={rec.value}
                      title={rec.label}
                      onPress={() => {
                        setRecurrenceType(rec.value as any);
                        setRecurrenceMenuVisible(false);
                      }}
                      left={props => <List.Icon {...props} icon="repeat" color={theme.colors.primary} />}
                      style={recurrenceType === rec.value ? { backgroundColor: theme.colors.primaryContainer } : {}}
                      titleStyle={{ color: recurrenceType === rec.value ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
                    />
                  ))}
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setRecurrenceMenuVisible(false)}>{t('common.cancel')}</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>

            {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
              <View style={styles.dayChipsContainer}>
                <Text style={[styles.dayChipsLabel, { color: theme.colors.onSurfaceVariant }]}>{t('createSession.selectDay')}</Text>
                <View style={styles.dayChips}>
                  {[
                    t('createSession.days.sunday'),
                    t('createSession.days.monday'),
                    t('createSession.days.tuesday'),
                    t('createSession.days.wednesday'),
                    t('createSession.days.thursday'),
                    t('createSession.days.friday'),
                    t('createSession.days.saturday')
                  ].map((day, index) => (
                    <Chip
                      key={index}
                      selected={recurrenceDay === index}
                      onPress={() => setRecurrenceDay(index)}
                      style={styles.dayChip}
                    >
                      {day}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {recurrenceType === 'monthly' && (
              <TextInput
                label={t('createSession.dayOfMonth')}
                value={recurrenceDay.toString()}
                onChangeText={(text) => {
                  const day = parseInt(text);
                  if (!isNaN(day) && day >= 1 && day <= 31) {
                    setRecurrenceDay(day);
                  }
                }}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
              />
            )}

            <Button
              mode="outlined"
              onPress={() => setShowEndDatePicker(true)}
              style={styles.input}
              icon="calendar-end"
            >
              {endDate ? t('createSession.endDate') + ': ' + format(endDate, 'dd MMM yyyy', { locale: getDateLocale() }) : t('createSession.endDateOptional')}
            </Button>

            <Text style={[styles.recurringInfo, { color: theme.colors.onSurfaceVariant }]}>
              {t('createSession.recurringInfo')}
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {isRecurring ? t('createSession.createRecurring') : t('session.create')}
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
            <View style={[styles.datePickerContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Tarih Seç</Text>
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
            <View style={[styles.datePickerContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Saat Seç</Text>
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

      {/* End Date Picker Modal */}
      {showEndDatePicker && (
        <Portal>
          <Modal
            visible={showEndDatePicker}
            onDismiss={() => setShowEndDatePicker(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={[styles.datePickerContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Bitiş Tarihi Seç</Text>
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
                locale="tr-TR"
                minimumDate={sessionDate}
              />
              <View style={styles.modalButtons}>
                <Button onPress={() => {
                  setEndDate(null);
                  setShowEndDatePicker(false);
                }} style={styles.modalButton}>
                  Temizle
                </Button>
                <Button mode="contained" onPress={() => setShowEndDatePicker(false)} style={styles.modalButton}>
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
  },
  form: {
    padding: 20,
  },
  input: {
    marginBottom: 15,
  },
  mapButton: {
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
  recurringContainer: {
    marginBottom: 10,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  recurringOptions: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  dayChipsContainer: {
    marginVertical: 10,
  },
  dayChipsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  recurringInfo: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 18,
  },
  sportDialog: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
  },
  dialogScrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
});
