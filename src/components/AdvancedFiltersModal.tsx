import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Text, Button, Switch, Chip, useTheme, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import { getDateLocale } from '../utils/dateLocale';

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

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];
const DISTANCE_OPTIONS = [1, 5, 10, 25, 50, 100];

export default function AdvancedFiltersModal({
  visible,
  onDismiss,
  filters,
  onApply,
  hasLocation,
}: Props) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

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
      contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.primary }]}>{t('filters.advancedFilters')}</Text>
          <Button
            mode="text"
            onPress={onDismiss}
            style={styles.closeButton}
            textColor={theme.colors.primary}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.primary} />
          </Button>
        </View>

        {/* Distance Filter */}
        {hasLocation ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('filters.distance')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('filters.maxDistanceFromLocation')}
            </Text>
            <View style={styles.distanceControl}>
              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>{t('filters.distanceLimit')}</Text>
                <Switch
                  value={localFilters.maxDistance !== null}
                  onValueChange={(value) => updateFilter('maxDistance', value ? 50 : null)}
                />
              </View>

              {localFilters.maxDistance !== null && (
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderValue}>{localFilters.maxDistance} {t('map.km')}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1}
                    value={localFilters.maxDistance}
                    onValueChange={(value) => updateFilter('maxDistance', value)}
                    minimumTrackTintColor="#6200ee"
                    maximumTrackTintColor="#000000"
                    thumbTintColor="#6200ee"
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>1 {t('map.km')}</Text>
                    <Text style={styles.sliderLabel}>100 {t('map.km')}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.disabledSection}>
              <MaterialCommunityIcons name="map-marker-off" size={32} color="#999" />
              <Text style={styles.disabledText}>
                {t('filters.enableLocationForDistance')}
              </Text>
            </View>
          </View>
        )}

        {/* Date Range Filter */}
        <Card style={[styles.filterCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="calendar-range" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('filters.dateRange')}</Text>
            </View>

            <View style={styles.quickDateButtons}>
              <Chip
                selected={false}
                onPress={() => {
                  const today = new Date();
                  updateFilter('dateFrom', today);
                  updateFilter('dateTo', null);
                }}
                compact
                style={styles.quickDateChip}
              >
                {t('date.today')}
              </Chip>
              <Chip
                selected={false}
                onPress={() => {
                  const today = new Date();
                  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  updateFilter('dateFrom', today);
                  updateFilter('dateTo', nextWeek);
                }}
                compact
                style={styles.quickDateChip}
              >
                {t('date.thisWeek')}
              </Chip>
              <Chip
                selected={false}
                onPress={() => {
                  const today = new Date();
                  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                  updateFilter('dateFrom', today);
                  updateFilter('dateTo', nextMonth);
                }}
                compact
                style={styles.quickDateChip}
              >
                {t('date.thisMonth')}
              </Chip>
            </View>

            {(localFilters.dateFrom || localFilters.dateTo) && (
              <View style={[styles.selectedDatesContainer, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.selectedDateRow}>
                  <MaterialCommunityIcons name="calendar-start" size={14} color={theme.colors.primary} />
                  <Text style={[styles.selectedDateText, { color: theme.colors.onSurface }]}>
                    {localFilters.dateFrom ? format(localFilters.dateFrom, 'dd MMM yyyy', { locale: getDateLocale() }) : t('filters.noStartDate')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={14} color={theme.colors.onSurfaceVariant} />
                <View style={styles.selectedDateRow}>
                  <MaterialCommunityIcons name="calendar-end" size={14} color={theme.colors.primary} />
                  <Text style={[styles.selectedDateText, { color: theme.colors.onSurface }]}>
                    {localFilters.dateTo ? format(localFilters.dateTo, 'dd MMM yyyy', { locale: getDateLocale() }) : t('filters.noEndDate')}
                  </Text>
                </View>
                <Button
                  mode="text"
                  onPress={() => {
                    updateFilter('dateFrom', null);
                    updateFilter('dateTo', null);
                  }}
                  compact
                  textColor={theme.colors.error}
                >
                  {t('common.clear')}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Skill Level Filter */}
        <Card style={[styles.filterCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-star" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('session.skillLevel')}</Text>
            </View>
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
                textStyle={{ fontSize: 12 }}
                compact
              >
                {t(`skillLevel.${level}`)}
              </Chip>
            ))}
            </View>
          </Card.Content>
        </Card>

        {/* Only Available Sessions */}
        <Card style={[styles.filterCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <MaterialCommunityIcons name="account-check" size={20} color={theme.colors.primary} />
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>{t('filters.onlyAvailableSessions')}</Text>
                <Text style={[styles.switchSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {t('filters.hideFullSessions')}
                </Text>
              </View>
            </View>
            <Switch
              value={localFilters.onlyAvailable}
              onValueChange={(value) => updateFilter('onlyAvailable', value)}
            />
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.actionButton}
          >
            {t('filters.reset')}
          </Button>
          <Button
            mode="contained"
            onPress={handleApply}
            style={styles.actionButton}
          >
            {t('common.apply')}
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 8,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    maxHeight: '95%',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  filterCard: {
    margin: 10,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  section: {
    padding: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    height: 32,
    marginHorizontal: 2,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickDateChip: {
    flex: 1,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  selectedDateText: {
    fontSize: 11,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 8,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 2,
  },
  distanceControl: {
    marginTop: 5,
  },
  sliderContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
});
