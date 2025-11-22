import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Text, Surface, Switch, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, currentLanguage, languages } = useLanguage();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const settingsSections = [
    {
      title: t('settings.preferences'),
      items: [
        {
          icon: 'translate',
          title: t('settings.language'),
          subtitle: languages[currentLanguage].nativeName,
          onPress: () => navigation.navigate('LanguageSelection' as any),
          showChevron: true,
        },
        {
          icon: isDarkMode ? 'weather-night' : 'white-balance-sunny',
          title: t('settings.theme'),
          subtitle: isDarkMode ? t('settings.darkMode') : t('settings.lightMode'),
          onPress: toggleTheme,
          showToggle: true,
          toggleValue: isDarkMode,
        },
        {
          icon: 'bell-ring',
          title: t('settings.notifications'),
          subtitle: t('notifications.settings'),
          onPress: () => navigation.navigate('NotificationSettings' as any),
          showChevron: true,
        },
      ],
    },
    {
      title: t('settings.account'),
      items: [
        {
          icon: 'shield-account',
          title: t('settings.privacy'),
          subtitle: t('settings.blockedUsers'),
          onPress: () => navigation.navigate('BlockedUsers'),
          showChevron: true,
        },
      ],
    },
    {
      title: t('settings.about'),
      items: [
        {
          icon: 'help-circle',
          title: t('settings.help'),
          subtitle: t('settings.feedback'),
          onPress: () => {
            // Open help/support URL
            Linking.openURL('https://github.com/anthropics/claude-code/issues');
          },
          showChevron: true,
        },
        {
          icon: 'file-document',
          title: t('settings.termsOfService'),
          onPress: () => {
            // Open terms URL
          },
          showChevron: true,
        },
        {
          icon: 'shield-check',
          title: t('settings.privacyPolicy'),
          onPress: () => {
            // Open privacy policy URL
          },
          showChevron: true,
        },
        {
          icon: 'information',
          title: t('settings.version'),
          subtitle: '1.0.0',
          onPress: () => {},
          showChevron: false,
        },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header Card */}
        <Surface style={styles.headerCard} elevation={3}>
          <LinearGradient
            colors={isDarkMode ? ['#6200ee', '#9c27b0'] : ['#6200ee', '#9c27b0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cog" size={56} color="white" />
            </View>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              {t('settings.title')}
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Tercihlerinizi yönetin
            </Text>
          </LinearGradient>
        </Surface>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {section.title}
            </Text>

            <Surface style={styles.sectionCard} elevation={2}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  {itemIndex > 0 && <Divider />}
                  <SettingItem
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    onPress={item.onPress}
                    showChevron={item.showChevron}
                    showToggle={item.showToggle}
                    toggleValue={item.toggleValue}
                    theme={theme}
                  />
                </React.Fragment>
              ))}
            </Surface>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  theme: any;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = false,
  showToggle = false,
  toggleValue = false,
  theme,
}: SettingItemProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name={icon as any} size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text variant="bodyLarge" style={[styles.settingTitle, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
            {subtitle && (
              <Text variant="bodyMedium" style={[styles.settingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.settingRight}>
          {showToggle && <Switch value={toggleValue} onValueChange={onPress} />}
          {showChevron && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 36,
    alignItems: 'center',
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 13,
    opacity: 0.7,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  settingRight: {
    marginLeft: 12,
  },
});
