import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Text, Surface, Switch, Divider, useTheme as usePaperTheme } from 'react-native-paper';
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
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = usePaperTheme();

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
            Linking.openURL('mailto:support@sportbuddy.app');
          },
          showChevron: true,
        },
        {
          icon: 'file-document',
          title: t('settings.termsOfService'),
          onPress: () => {
            const termsUrl = currentLanguage === 'tr'
              ? 'https://canakboyraz.github.io/sportbuddy-legal-docs/terms-of-service-tr'
              : 'https://canakboyraz.github.io/sportbuddy-legal-docs/terms-of-service-en';
            Linking.openURL(termsUrl);
          },
          showChevron: true,
        },
        {
          icon: 'shield-check',
          title: t('settings.privacyPolicy'),
          onPress: () => {
            const privacyUrl = currentLanguage === 'tr'
              ? 'https://canakboyraz.github.io/sportbuddy-legal-docs/privacy-policy-tr'
              : 'https://canakboyraz.github.io/sportbuddy-legal-docs/privacy-policy-en';
            Linking.openURL(privacyUrl);
          },
          showChevron: true,
        },
        {
          icon: 'file-certificate',
          title: t('settings.kvkk'),
          onPress: () => {
            Linking.openURL('https://canakboyraz.github.io/sportbuddy-legal-docs/kvkk-aydinlatma-metni');
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
      {/* Modern Header */}
      <LinearGradient
        colors={['#6200ee', '#9c27b0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="tune-variant" size={48} color="white" />
          </View>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              {section.title}
            </Text>

            <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  {itemIndex > 0 && <Divider style={styles.divider} />}
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

        {/* App Info Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            Sport Buddy
          </Text>
          <Text style={[styles.footerSubtext, { color: theme.colors.onSurfaceVariant }]}>
            {t('settings.madeWithLove')}
          </Text>
        </View>
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 8,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  divider: {
    marginLeft: 72,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  settingRight: {
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 13,
  },
});
