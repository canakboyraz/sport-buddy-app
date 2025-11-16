import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Modal, Text, Button, Switch, Divider, Chip, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface AdvancedFilters {
  maxDistance: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  onlyAvailable: boolean;
  skillLevel: string | null;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  filters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
  hasLocation: boolean;
}

const SKILL_LEVELS = ['Başlangıç', 'Orta', 'İleri', 'Profesyonel'];
const DISTANCE_OPTIONS = [1, 5, 10, 25, 50, 100];

export default function AdvancedFiltersModal({
  visible,
  onDismiss,
  filters,
  onApply,
  hasLocation,
}: Props) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);

  const handleApply = () => {
    onApply(localFilters);
    onDismiss();
  };

  const handleReset = () => {
    const resetFilters: AdvancedFilters = {
      maxDistance: null,
      dateFrom: null,
      dateTo: null,
      onlyAvailable: false,
      skillLevel: null,
    };
    setLocalFilters(resetFilters);
  };

  const updateFilter = (key: keyof AdvancedFilters, value: any) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.modalContainer}
    >
      <ScrollView>
        <View style={styles.header}>
          <MaterialCommunityIcons name="filter" size={24} color="#6200ee" />
          <Text style={styles.title}>Gelişmiş Filtreler</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Distance Filter */}
        {hasLocation ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mesafe (km)</Text>
            <Text style={styles.sectionSubtitle}>
              Konumunuza olan maksimum mesafe
            </Text>
            <View style={styles.chipContainer}>
              {DISTANCE_OPTIONS.map((distance) => (
                <Chip
                  key={distance}
                  selected={localFilters.maxDistance === distance}
                  onPress={() => updateFilter('maxDistance', distance)}
                  style={styles.chip}
                >
                  {distance} km
                </Chip>
              ))}
              <Chip
                selected={localFilters.maxDistance === null}
                onPress={() => updateFilter('maxDistance', null)}
                style={styles.chip}
              >
                Tümü
              </Chip>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.disabledSection}>
              <MaterialCommunityIcons name="map-marker-off" size={32} color="#999" />
              <Text style={styles.disabledText}>
                Mesafe filtresini kullanmak için konum erişimine izin verin
              </Text>
            </View>
          </View>
        )}

        <Divider style={styles.divider} />

        {/* Date Range Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarih Aralığı</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Başlangıç:</Text>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setShowDateFromPicker(true)}
                style={styles.dateButton}
              >
                {localFilters.dateFrom
                  ? format(localFilters.dateFrom, 'dd MMM yyyy', { locale: tr })
                  : 'Seç'}
              </Button>
              {localFilters.dateFrom && (
                <Button
                  mode="text"
                  onPress={() => updateFilter('dateFrom', null)}
                  compact
                >
                  Temizle
                </Button>
              )}
            </View>

            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Bitiş:</Text>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setShowDateToPicker(true)}
                style={styles.dateButton}
              >
                {localFilters.dateTo
                  ? format(localFilters.dateTo, 'dd MMM yyyy', { locale: tr })
                  : 'Seç'}
              </Button>
              {localFilters.dateTo && (
                <Button
                  mode="text"
                  onPress={() => updateFilter('dateTo', null)}
                  compact
                >
                  Temizle
                </Button>
              )}
            </View>
          </View>

          {showDateFromPicker && (
            <DateTimePicker
              value={localFilters.dateFrom || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDateFromPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  updateFilter('dateFrom', selectedDate);
                }
              }}
            />
          )}

          {showDateToPicker && (
            <DateTimePicker
              value={localFilters.dateTo || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={localFilters.dateFrom || new Date()}
              onChange={(event, selectedDate) => {
                setShowDateToPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  updateFilter('dateTo', selectedDate);
                }
              }}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Skill Level Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seviye</Text>
          <View style={styles.chipContainer}>
            {SKILL_LEVELS.map((level) => (
              <Chip
                key={level}
                selected={localFilters.skillLevel === level}
                onPress={() =>
                  updateFilter(
                    'skillLevel',
                    localFilters.skillLevel === level ? null : level
                  )
                }
                style={styles.chip}
              >
                {level}
              </Chip>
            ))}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Only Available Sessions */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <MaterialCommunityIcons name="account-check" size={24} color="#6200ee" />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchTitle}>Sadece Boş Etkinlikler</Text>
                <Text style={styles.switchSubtitle}>
                  Katılımcı kotası dolu olan etkinlikleri gizle
                </Text>
              </View>
            </View>
            <Switch
              value={localFilters.onlyAvailable}
              onValueChange={(value) => updateFilter('onlyAvailable', value)}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.actionButton}
          >
            Sıfırla
          </Button>
          <Button
            mode="contained"
            onPress={handleApply}
            style={styles.actionButton}
          >
            Uygula
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  divider: {
    marginVertical: 10,
  },
  section: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  disabledSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  disabledText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateButton: {
    marginBottom: 5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  switchTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  switchSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
