import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Modal, Text, Button, Switch, useTheme, Surface, IconButton } from 'react-native-paper';
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
const { width } = Dimensions.get('window');

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

  // Update local state when prop changes
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

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

  const renderDateOption = (label: string, icon: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dateOption,
        {
          backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
        }
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
      />
      <Text style={[
        styles.dateOptionLabel,
        { color: isSelected ? theme.colors.primary : theme.colors.onSurface }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSkillOption = (level: string) => {
    const isSelected = localFilters.skillLevel === level;
    return (
      <TouchableOpacity
        key={level}
        onPress={() => updateFilter('skillLevel', isSelected ? null : level)}
        style={[
          styles.skillOption,
          {
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
          }
        ]}
      >
        <Text style={[
          styles.skillOptionText,
          { color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }
        ]}>
          {t(`skillLevel.${level}`)}
        </Text>
        {isSelected && (
          <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.onPrimary} style={styles.skillCheck} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{t('filters.advancedFilters')}</Text>
        <IconButton
          icon="close"
          size={24}
          onPress={onDismiss}
          style={styles.closeButton}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Distance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>{t('filters.distance')}</Text>
          </View>

          {hasLocation ? (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.distanceValueContainer}>
                <Text style={[styles.distanceValue, { color: theme.colors.primary }]}>
                  {localFilters.maxDistance ? `${localFilters.maxDistance} km` : '∞'}
                </Text>
                <Text style={[styles.distanceLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {localFilters.maxDistance ? t('filters.maxDistanceFromLocation') : t('filters.distanceLimit')}
                </Text>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={localFilters.maxDistance || 100}
                onValueChange={(value) => updateFilter('maxDistance', value)}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.surfaceVariant}
                thumbTintColor={theme.colors.primary}
              />

              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurface }}>{t('filters.distanceLimit')}</Text>
                <Switch
                  value={localFilters.maxDistance !== null}
                  onValueChange={(value) => updateFilter('maxDistance', value ? 50 : null)}
                  color={theme.colors.primary}
                />
              </View>
            </Surface>
          ) : (
            <Surface style={[styles.card, styles.disabledCard]} elevation={0}>
              <MaterialCommunityIcons name="map-marker-off" size={32} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.disabledText, { color: theme.colors.onSurfaceVariant }]}>
                {t('filters.enableLocationForDistance')}
              </Text>
            </Surface>
          )}
        </View>

        {/* Date Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-month" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>{t('filters.dateRange')}</Text>
          </View>

          <View style={styles.dateGrid}>
            {renderDateOption(t('date.today'), 'calendar-today',
              !!localFilters.dateFrom && format(localFilters.dateFrom, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && !localFilters.dateTo,
              () => {
                const today = new Date();
                updateFilter('dateFrom', today);
                updateFilter('dateTo', null);
              }
            )}

            {renderDateOption(t('date.thisWeek'), 'calendar-week',
              !!localFilters.dateTo && localFilters.dateTo > new Date(),
              () => {
                const today = new Date();
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                updateFilter('dateFrom', today);
                updateFilter('dateTo', nextWeek);
              }
            )}

            {renderDateOption(t('date.thisMonth'), 'calendar-month',
              !!localFilters.dateTo && localFilters.dateTo > new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000), // Rough check
              () => {
                const today = new Date();
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                updateFilter('dateFrom', today);
                updateFilter('dateTo', nextMonth);
              }
            )}

            {renderDateOption(t('common.all'), 'calendar-remove',
              !localFilters.dateFrom && !localFilters.dateTo,
              () => {
                updateFilter('dateFrom', null);
                updateFilter('dateTo', null);
              }
            )}
          </View>
        </View>

        {/* Skill Level Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>{t('session.skillLevel')}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillList}>
            {SKILL_LEVELS.map(renderSkillOption)}
          </ScrollView>
        </View>

        {/* Availability Section */}
        <View style={styles.section}>
          <Surface style={[styles.card, styles.availabilityCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.availabilityInfo}>
              <MaterialCommunityIcons name="account-check-outline" size={24} color={theme.colors.primary} />
              <View style={styles.availabilityText}>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{t('filters.onlyAvailableSessions')}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{t('filters.hideFullSessions')}</Text>
              </View>
            </View>
            <Switch
              value={localFilters.onlyAvailable}
              onValueChange={(value) => updateFilter('onlyAvailable', value)}
              color={theme.colors.primary}
            />
          </Surface>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.outline }]}>
        <Button
          mode="outlined"
          onPress={handleReset}
          style={styles.resetButton}
          textColor={theme.colors.onSurface}
        >
          {t('filters.reset')}
        </Button>
        <Button
          mode="contained"
          onPress={handleApply}
          style={styles.applyButton}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
        >
          {t('common.apply')}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 0,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  distanceValueContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  distanceLabel: {
    fontSize: 12,
  },
  slider: {
    width: '100%',
    height: 30,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  disabledCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  disabledText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateOption: {
    width: (width - 48) / 2,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dateOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  skillList: {
    gap: 8,
    paddingRight: 20,
  },
  skillOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skillCheck: {
    marginLeft: 2,
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  availabilityText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resetButton: {
    flex: 1,
    borderColor: '#ddd',
  },
  applyButton: {
    flex: 2,
    borderRadius: 12,
  },
});
