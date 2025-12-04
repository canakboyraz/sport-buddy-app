import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { TextInput, Button, Text, Checkbox, Surface, useTheme, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { secureStore } from '../../services/secureStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLanguage } from '../../contexts/LanguageContext';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const theme = useTheme();

  console.log('[LoginScreen] t function test: t("auth.login") =', t('auth.login'));
  console.log('[LoginScreen] t function test: t("auth.email") =', t('auth.email'));
  console.log('[LoginScreen] t function test: t("common.appName") =', t('common.appName'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
    checkAppleAuthAvailability();
  }, []);

  const checkAppleAuthAvailability = async () => {
    const available = await AppleAuthentication.isAvailableAsync();
    setAppleAuthAvailable(available);
  };

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await secureStore.getItem('rememberedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
      // Clean up any old saved passwords (security fix)
      await secureStore.deleteItem('rememberedPassword');
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert(t('auth.loginError'), error.message);
    } else {
      // Save only email if "Remember Me" is checked (NEVER save password)
      if (rememberMe) {
        try {
          await secureStore.setItem('rememberedEmail', email);
        } catch (error) {
          console.error('Error saving email:', error);
        }
      } else {
        // Clear saved email if "Remember Me" is unchecked
        try {
          await secureStore.deleteItem('rememberedEmail');
        } catch (error) {
          console.error('Error clearing email:', error);
        }
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        // Apple'dan gelen ad-soyad bilgisini hazırla
        let fullName = '';
        if (credential.fullName) {
          const firstName = credential.fullName.givenName || '';
          const lastName = credential.fullName.familyName || '';
          fullName = `${firstName} ${lastName}`.trim();
          console.log('[LoginScreen] Apple fullName received:', fullName);
        } else {
          console.log('[LoginScreen] Apple did not provide fullName (user logged in before)');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;

        console.log('[LoginScreen] Supabase user data:', data?.user);

        // Check if profile already has a full_name
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single();

        console.log('[LoginScreen] Existing profile:', existingProfile);

        // Only update if we have a new fullName OR if profile doesn't have a name yet
        if (data?.user) {
          if (fullName) {
            // We got a name from Apple, save it
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName,
              email: data.user.email,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            });
            console.log('[LoginScreen] Profile updated with Apple fullName');
          } else if (!existingProfile?.full_name) {
            // No name from Apple and profile has no name - prompt user
            Alert.alert(
              t('auth.welcome'),
              t('auth.pleaseEnterName'),
              [{ text: t('common.ok') }]
            );
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled
        return;
      }
      Alert.alert(t('common.error'), error.message || t('auth.appleLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.dark
        ? [theme.colors.primaryContainer, theme.colors.secondaryContainer]
        : ['#6200ee', '#9c27b0']
      }
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={4}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>{t('common.appName')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{t('auth.loginSubtitle')}</Text>

          <TextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <View style={styles.rememberMeContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
            />
            <Text style={[styles.rememberMeText, { color: theme.colors.onSurface }]} onPress={() => setRememberMe(!rememberMe)}>
              {t('auth.rememberMe')}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={{ height: 48 }}
          >
            {t('auth.login')}
          </Button>

          {appleAuthAvailable && Platform.OS === 'ios' && (
            <>
              <View style={styles.dividerContainer}>
                <Divider style={styles.divider} />
                <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>{t('auth.or')}</Text>
                <Divider style={styles.divider} />
              </View>

              <Button
                mode="outlined"
                onPress={handleAppleLogin}
                disabled={loading}
                style={styles.socialButton}
                contentStyle={{ height: 48 }}
                icon="apple"
              >
                {t('auth.loginWithApple')}
              </Button>
            </>
          )}

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerButton}
          >
            {t('auth.dontHaveAccount')} {t('auth.register')}
          </Button>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: theme.colors.onSurfaceVariant }]}>
              {t('auth.loginTermsDisclaimer') || 'By logging in, you agree to our'}{' '}
              <Text
                style={[styles.termsLink, { color: theme.colors.primary }]}
                onPress={() => {
                  const url = t('common.languageCode') === 'tr'
                    ? 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/terms-of-service-tr.html'
                    : 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/terms-of-service-en.html';
                  Linking.openURL(url);
                }}
              >
                {t('auth.termsOfService') || 'Terms of Service'}
              </Text>
              {' '}{t('common.and') || 'and'}{' '}
              <Text
                style={[styles.termsLink, { color: theme.colors.primary }]}
                onPress={() => {
                  const url = t('common.languageCode') === 'tr'
                    ? 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/privacy-policy-tr.html'
                    : 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/privacy-policy-en.html';
                  Linking.openURL(url);
                }}
              >
                {t('auth.privacyPolicy') || 'Privacy Policy'}
              </Text>
            </Text>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
  },
  button: {
    borderRadius: 8,
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButton: {
    borderRadius: 8,
    marginBottom: 12,
  },
  registerButton: {
    marginTop: 8,
  },
  termsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: 'bold',
  },
});
