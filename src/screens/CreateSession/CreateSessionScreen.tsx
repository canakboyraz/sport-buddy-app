import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, StatusBar } from 'react-native';
import { TextInput, Button, Menu, Text, Portal, Modal, Dialog, Switch, Chip, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { Sport } from '../../types';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapPicker from '../../components/MapPicker';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
          Alert.alert('Hata', recurringError.message);
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
          Alert.alert('Uyarı', 'Tekrarlayan seans şablonu oluşturuldu ancak otomatik seanslar oluşturulamadı.');
        } else {
          const sessionCount = generatedSessions?.length || 0;
          Alert.alert(
            'Başarılı',
            `Tekrarlayan seans oluşturuldu! ${sessionCount} adet seans otomatik olarak oluşturuldu.`,
            [
              {
                text: 'Tamam',
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
          Alert.alert('Hata', error.message);
        } else {
          Alert.alert('Başarılı', 'Seans oluşturuldu!', [
            {
              text: 'Tamam',
              onPress: resetForm,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error in handleCreate:', error);
      setLoading(false);
      Alert.alert('Hata', 'Seans oluşturulurken bir hata oluştu');
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#6200ee', '#9c27b0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="plus-circle-outline" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Yeni Seans Oluştur</Text>
          <Text style={styles.headerSubtitle}>Spor arkadaşlarını bul ve etkinlik düzenle</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="information" size={20} color="#6200ee" /> Temel Bilgiler
            </Text>

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
                  left={<TextInput.Icon icon="soccer" />}
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
              left={<TextInput.Icon icon="text" />}
              placeholder="Örn: Pazar Futbolu"
            />

            <TextInput
              label="Açıklama"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              left={<TextInput.Icon icon="text-box" />}
              placeholder="Seans hakkında detaylı bilgi..."
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" /> Konum
            </Text>

            <TextInput
              label="Konum *"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
              right={
                <TextInput.Icon
                  icon="crosshairs-gps"
                  onPress={getCurrentLocation}
                />
              }
              placeholder="Konum adresini girin"
            />

            <Button
              mode="outlined"
              onPress={() => setMapVisible(true)}
              style={styles.mapButton}
              icon="map-search"
            >
              Haritadan Konum Seç
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
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#6200ee" /> Tarih ve Zaman
            </Text>

            <Button
              mode="outlined"
              onPress={showDatePicker}
              style={styles.input}
              icon="calendar-clock"
              contentStyle={styles.dateButtonContent}
            >
              {format(sessionDate, 'dd MMM yyyy, HH:mm', { locale: tr })}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-group" size={20} color="#6200ee" /> Katılımcılar
            </Text>

            <TextInput
              label="Maksimum Katılımcı *"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="account-multiple" />}
              placeholder="Örn: 10"
            />

            <Menu
              visible={skillMenuVisible}
              onDismiss={() => setSkillMenuVisible(false)}
              anchor={
                <TextInput
                  label="Seviye"
                  value={skillLevel === 'any' ? 'Herkes' : skillLevel === 'beginner' ? 'Başlangıç' : skillLevel === 'intermediate' ? 'Orta' : 'İleri'}
                  mode="outlined"
                  style={styles.input}
                  editable={false}
                  left={<TextInput.Icon icon="star" />}
                  right={<TextInput.Icon icon="chevron-down" onPress={() => setSkillMenuVisible(true)} />}
                  onPressIn={() => setSkillMenuVisible(true)}
                />
              }
            >
              <Menu.Item onPress={() => { setSkillLevel('any'); setSkillMenuVisible(false); }} title="Herkes" />
              <Menu.Item onPress={() => { setSkillLevel('beginner'); setSkillMenuVisible(false); }} title="Başlangıç" />
              <Menu.Item onPress={() => { setSkillLevel('intermediate'); setSkillMenuVisible(false); }} title="Orta" />
              <Menu.Item onPress={() => { setSkillLevel('advanced'); setSkillMenuVisible(false); }} title="İleri" />
            </Menu>
          </Card.Content>
        </Card>

        {/* Recurring Session Options */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.recurringHeader}>
              <View style={styles.recurringTitleContainer}>
                <MaterialCommunityIcons name="calendar-refresh" size={20} color="#6200ee" />
                <Text style={styles.recurringLabel}>Tekrarlayan Etkinlik</Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring} />
            </View>

            {isRecurring && (
              <View style={styles.recurringOptions}>
                <Menu
                  visible={recurrenceMenuVisible}
                  onDismiss={() => setRecurrenceMenuVisible(false)}
                  anchor={
                    <TextInput
                      label="Tekrarlama Sıklığı"
                      value={
                        recurrenceType === 'daily' ? 'Her Gün' :
                        recurrenceType === 'weekly' ? 'Her Hafta' :
                        recurrenceType === 'biweekly' ? 'İki Haftada Bir' :
                        'Her Ay'
                      }
                      mode="outlined"
                      style={styles.input}
                      editable={false}
                      left={<TextInput.Icon icon="refresh" />}
                      right={<TextInput.Icon icon="chevron-down" onPress={() => setRecurrenceMenuVisible(true)} />}
                      onPressIn={() => setRecurrenceMenuVisible(true)}
                    />
                  }
                >
                  <Menu.Item onPress={() => { setRecurrenceType('daily'); setRecurrenceMenuVisible(false); }} title="Her Gün" />
                  <Menu.Item onPress={() => { setRecurrenceType('weekly'); setRecurrenceMenuVisible(false); }} title="Her Hafta" />
                  <Menu.Item onPress={() => { setRecurrenceType('biweekly'); setRecurrenceMenuVisible(false); }} title="İki Haftada Bir" />
                  <Menu.Item onPress={() => { setRecurrenceType('monthly'); setRecurrenceMenuVisible(false); }} title="Her Ay" />
                </Menu>

                {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
                  <View style={styles.dayChipsContainer}>
                    <Text style={styles.dayChipsLabel}>Gün Seçin:</Text>
                    <View style={styles.dayChips}>
                      {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, index) => (
                        <Chip
                          key={index}
                          selected={recurrenceDay === index}
                          onPress={() => setRecurrenceDay(index)}
                          style={styles.dayChip}
                          mode="outlined"
                        >
                          {day}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {recurrenceType === 'monthly' && (
                  <TextInput
                    label="Ayın Hangi Günü (1-31)"
                    value={recurrenceDay.toString()}
                    onChangeText={(text) => {
                      const day = parseInt(text);
                      if (!isNaN(day) && day >= 1 && day <= 31) {
                        setRecurrenceDay(day);
                      }
                    }}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Icon icon="calendar-month" />}
                  />
                )}

                <Button
                  mode="outlined"
                  onPress={() => setShowEndDatePicker(true)}
                  style={styles.input}
                  icon="calendar-end"
                >
                  {endDate ? `Bitiş: ${format(endDate, 'dd MMM yyyy', { locale: tr })}` : 'Bitiş Tarihi (İsteğe Bağlı)'}
                </Button>

                <View style={styles.infoBox}>
                  <MaterialCommunityIcons name="information" size={20} color="#6200ee" />
                  <Text style={styles.recurringInfo}>
                    Tekrarlayan etkinlik aktif olduğu sürece önümüzdeki 30 gün için otomatik seanslar oluşturulur.
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
          icon={isRecurring ? 'calendar-refresh' : 'plus-circle'}
          contentStyle={styles.createButtonContent}
        >
          {isRecurring ? 'Tekrarlayan Seans Oluştur' : 'Seans Oluştur'}
        </Button>
      </ScrollView>

      {/* Date Picker Modal for iOS/Web */}
      {Platform.OS !== 'android' && showDatePickerModal && (
        <Portal>
          <Modal
            visible={showDatePickerModal}
            onDismiss={() => setShowDatePickerModal(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={styles.datePickerCard}>
              <Card.Content>
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
              </Card.Content>
            </Card>
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
            <Card style={styles.datePickerCard}>
              <Card.Content>
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
              </Card.Content>
            </Card>
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
            <Card style={styles.datePickerCard}>
              <Card.Content>
                <Text style={styles.modalTitle}>Bitiş Tarihi Seç</Text>
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
              </Card.Content>
            </Card>
          </Modal>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerContent: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    marginBottom: 12,
  },
  mapButton: {
    marginTop: 4,
  },
  dateButtonContent: {
    paddingVertical: 8,
  },
  createButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  modalContainer: {
    margin: 20,
  },
  datePickerCard: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 8,
  },
  modalButton: {
    flex: 1,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recurringTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recurringOptions: {
    marginTop: 12,
  },
  dayChipsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  dayChipsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e8eaf6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  recurringInfo: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
});
