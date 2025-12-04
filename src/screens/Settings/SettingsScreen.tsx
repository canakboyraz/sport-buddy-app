import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Text, Surface, Switch, Divider, useTheme as usePaperTheme, Dialog, Portal, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { supabase } from '../../services/supabase';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, currentLanguage, languages } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = usePaperTheme();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      // Get current user
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();

      if (getUserError || !user) {
        Alert.alert(
          t('common.error') || 'Error',
          t('auth.notLoggedIn') || 'You must be logged in to delete your account'
        );
        return;
      }

      // Check if user is logged in via password or social provider
      const isPasswordUser = user.app_metadata.provider === 'email';

      if (isPasswordUser) {
        // For password users, require password confirmation
        if (!password.trim()) {
          Alert.alert(
            t('common.error') || 'Error',
            t('settings.enterPasswordToConfirm') || 'Please enter your password to confirm account deletion'
          );
          return;
        }
      }

      setIsDeleting(true);

      if (isPasswordUser) {
        // Step 1: Re-authenticate user with password
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email || '',
          password: password,
        });

        if (authError) {
          Alert.alert(
            t('common.error') || 'Error',
            t('settings.incorrectPassword') || 'Incorrect password. Please try again.'
          );
          setIsDeleting(false);
          return;
        }
      }

      // Step 2: Call the delete_user_account function
      const { error: deleteError } = await supabase.rpc('delete_user_account', {
        user_id: user.id
      });

      if (deleteError) {
        console.error('Delete account error:', deleteError);
        Alert.alert(
          t('common.error') || 'Error',
          t('settings.deleteAccountError') || 'Failed to delete account. Please contact support at privacy@sportbuddy.app'
        );
        setIsDeleting(false);
        return;
      }

      // Step 3: Sign out
      await supabase.auth.signOut();

      // Success message (will show briefly before user is logged out)
      Alert.alert(
        t('common.success') || 'Success',
        t('settings.accountDeleted') || 'Your account has been permanently deleted.'
      );

      setShowDeleteDialog(false);
      setPassword('');
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('settings.deleteAccountError') || 'Failed to delete account. Please contact support at privacy@sportbuddy.app'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount') || 'Delete Account',
      t('settings.deleteAccountWarning') ||
      'This will permanently delete:\n\n' +
      '• Your profile and personal information\n' +
      '• All your created sessions\n' +
      '• All your messages\n' +
      '• Your ratings and reviews\n' +
      '• All associated data\n\n' +
      'This action CANNOT be undone.',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: () => setShowDeleteDialog(true),
        },
      ]
    );
  };

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
        {
          icon: 'delete-forever',
          title: t('settings.deleteAccount') || 'Delete Account',
          subtitle: t('settings.deleteAccountSubtitle') || 'Permanently delete your account and data',
          onPress: confirmDeleteAccount,
          showChevron: true,
          isDanger: true,
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
              ? 'https://canakboyraz.github.io/sport-buddy-app/terms-of-service-tr.html'
              : 'https://canakboyraz.github.io/sport-buddy-app/terms-of-service-en.html';
            Linking.openURL(termsUrl);
          },
          showChevron: true,
        },
        {
          icon: 'shield-check',
          title: t('settings.privacyPolicy'),
          onPress: () => {
            const privacyUrl = currentLanguage === 'tr'
              ? 'https://canakboyraz.github.io/sport-buddy-app/privacy-policy-tr.html'
              : 'https://canakboyraz.github.io/sport-buddy-app/privacy-policy-en.html';
            Linking.openURL(privacyUrl);
          },
          showChevron: true,
        },
        {
          icon: 'file-certificate',
          title: t('settings.kvkk'),
          onPress: () => {
            Linking.openURL('https://canakboyraz.github.io/sport-buddy-app/kvkk-aydinlatma-metni.html');
          },
          showChevron: true,
        },
        {
          icon: 'information',
          title: t('settings.version'),
          subtitle: '1.0.0',
          onPress: () => { },
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
                    isDanger={item.isDanger}
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

      {/* Delete Account Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => !isDeleting && setShowDeleteDialog(false)}>
          <Dialog.Title>{t('settings.confirmDeletion') || 'Confirm Account Deletion'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              {t('settings.deleteAccountWarning') || 'Are you sure you want to delete your account? This action cannot be undone.'}
            </Text>
            {/* Only show password input if user signed in with email/password */}
            {/* We can't easily check provider here without state, so we'll just show it but make it optional in UI if we could, 
                but better to check provider in state. For now, let's just keep it simple and rely on the logic in handleDeleteAccount 
                to ignore it if not needed, but for UI UX it's better to hide it. 
                Let's add a state for isPasswordUser */}
            <TextInput
              label={t('auth.password') || 'Password (if applicable)'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              disabled={isDeleting}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onPress={handleDeleteAccount}
              loading={isDeleting}
              disabled={isDeleting}
              buttonColor={theme.colors.error}
              textColor="white"
            >
              {t('common.delete') || 'Delete'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  isDanger?: boolean;
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
  isDanger = false,
  theme,
}: SettingItemProps) {
  const iconColor = isDanger ? theme.colors.error : theme.colors.primary;
  const iconBgColor = isDanger ? `${theme.colors.error}20` : theme.colors.primaryContainer;
  const titleColor = isDanger ? theme.colors.error : theme.colors.onSurface;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons name={icon as any} size={26} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text variant="bodyLarge" style={[styles.settingTitle, { color: titleColor }]}>
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
