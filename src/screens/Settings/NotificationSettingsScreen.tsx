import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Switch, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationSettings {
  enabled: boolean;
  sessionReminders: boolean;
  newParticipants: boolean;
  participantApprovals: boolean;
  newMessages: boolean;
  friendRequests: boolean;
  achievements: boolean;
  ratings: boolean;
  reminderTwoHours: boolean;
  reminderOneHour: boolean;
  reminderThirtyMinutes: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sessionReminders: true,
  newParticipants: true,
  participantApprovals: true,
  newMessages: true,
  friendRequests: true,
  achievements: true,
  ratings: true,
  reminderTwoHours: true,
  reminderOneHour: true,
  reminderThirtyMinutes: true,
};

export default function NotificationSettingsScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };

    // If enabling settings but permission not granted, request permission
    if (value && !permissionGranted) {
      requestPermission();
      return;
    }

    // If disabling main switch, disable all
    if (key === 'enabled' && !value) {
      Object.keys(newSettings).forEach((k) => {
        newSettings[k as keyof NotificationSettings] = false;
      });
    }

    saveSettings(newSettings);
  };

  const requestPermission = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      setPermissionGranted(true);
      updateSetting('enabled', true);
    } else {
      Alert.alert(
        t('notifications.permissionDenied'),
        t('notifications.enableInSettings')
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header Card */}
        <Surface style={styles.headerCard} elevation={2}>
          <LinearGradient
            colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialCommunityIcons name="bell-ring" size={48} color={theme.colors.primary} />
            </View>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              {t('notifications.settings')}
            </Text>
          </LinearGradient>
        </Surface>

        {/* Permission Warning */}
        {!permissionGranted && (
          <Surface style={styles.warningCard} elevation={1}>
            <LinearGradient
              colors={['#ff9800' + '20', '#ff9800' + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.warningGradient}
            >
              <MaterialCommunityIcons name="alert-circle" size={24} color="#ff9800" />
              <View style={styles.warningTextContainer}>
                <Text variant="titleSmall" style={styles.warningTitle}>
                  {t('notifications.permissionRequired')}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('notifications.enableInSettings')}
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={requestPermission}
                buttonColor="#ff9800"
                style={styles.enableButton}
              >
                {t('notifications.enable')}
              </Button>
            </LinearGradient>
          </Surface>
        )}

        {/* Main Toggle */}
        <Surface style={styles.sectionCard} elevation={1}>
          <LinearGradient
            colors={[theme.colors.primary + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons
                  name="bell"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t('notifications.types.all')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {settings.enabled
                      ? t('notifications.enable')
                      : t('notifications.disable')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => updateSetting('enabled', value)}
                disabled={!permissionGranted}
              />
            </View>
          </LinearGradient>
        </Surface>

        {/* Notification Types */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              {t('notifications.types.all')}
            </Text>
          </View>
          <Divider />

          <SettingItem
            icon="calendar-clock"
            title={t('notifications.types.sessionReminder')}
            value={settings.sessionReminders}
            onToggle={(value) => updateSetting('sessionReminders', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="account-multiple-plus"
            title={t('notifications.types.newParticipant')}
            value={settings.newParticipants}
            onToggle={(value) => updateSetting('newParticipants', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="check-circle"
            title={t('notifications.types.participantApproved')}
            value={settings.participantApprovals}
            onToggle={(value) => updateSetting('participantApprovals', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="message-text"
            title={t('notifications.types.newMessage')}
            value={settings.newMessages}
            onToggle={(value) => updateSetting('newMessages', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="account-multiple"
            title={t('notifications.types.friendRequest')}
            value={settings.friendRequests}
            onToggle={(value) => updateSetting('friendRequests', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="trophy"
            title={t('notifications.types.achievement')}
            value={settings.achievements}
            onToggle={(value) => updateSetting('achievements', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="star"
            title={t('notifications.types.rating')}
            value={settings.ratings}
            onToggle={(value) => updateSetting('ratings', value)}
            disabled={!settings.enabled}
            theme={theme}
          />
        </Surface>

        {/* Reminder Timing */}
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              {t('notifications.reminderTiming.title')}
            </Text>
          </View>
          <Divider />

          <SettingItem
            icon="clock-time-two"
            title={t('notifications.reminderTiming.twoHours')}
            value={settings.reminderTwoHours}
            onToggle={(value) => updateSetting('reminderTwoHours', value)}
            disabled={!settings.enabled || !settings.sessionReminders}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="clock-time-one"
            title={t('notifications.reminderTiming.oneHour')}
            value={settings.reminderOneHour}
            onToggle={(value) => updateSetting('reminderOneHour', value)}
            disabled={!settings.enabled || !settings.sessionReminders}
            theme={theme}
          />
          <Divider />

          <SettingItem
            icon="clock-time-three"
            title={t('notifications.reminderTiming.thirtyMinutes')}
            value={settings.reminderThirtyMinutes}
            onToggle={(value) => updateSetting('reminderThirtyMinutes', value)}
            disabled={!settings.enabled || !settings.sessionReminders}
            theme={theme}
          />
        </Surface>
      </View>
    </ScrollView>
  );
}

interface SettingItemProps {
  icon: string;
  title: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled: boolean;
  theme: any;
}

function SettingItem({ icon, title, value, onToggle, disabled, theme }: SettingItemProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingLeft}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={disabled ? theme.colors.onSurfaceVariant : theme.colors.primary}
          style={styles.settingIcon}
        />
        <Text
          variant="bodyLarge"
          style={[
            styles.settingTitle,
            { color: theme.colors.onSurface },
            disabled && { opacity: 0.5 },
          ]}
        >
          {title}
        </Text>
      </View>
      <Switch value={value} onValueChange={onToggle} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningCard: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  warningGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  enableButton: {
    marginLeft: 12,
  },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '500',
  },
});
