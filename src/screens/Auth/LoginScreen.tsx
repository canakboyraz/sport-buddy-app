import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Checkbox, Surface, useTheme, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { secureStore } from '../../services/secureStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
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
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Giriş Hatası', error.message);
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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const redirectUrl = Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const { url } = result;
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Google ile giriş yapılamadı');
    } finally {
      setLoading(false);
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
              'Hoş Geldiniz!',
              'Lütfen profil ayarlarından adınızı ve soyadınızı girin.',
              [{ text: 'Tamam' }]
            );
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled
        return;
      }
      Alert.alert('Hata', error.message || 'Apple ile giriş yapılamadı');
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
          <Text style={[styles.title, { color: theme.colors.primary }]}>Sport Buddy</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Spor arkadaşını bul!</Text>

          <TextInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Şifre"
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
              Beni Hatırla
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
            Giriş Yap
          </Button>

          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>veya</Text>
            <Divider style={styles.divider} />
          </View>

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            disabled={loading}
            style={styles.socialButton}
            contentStyle={{ height: 48 }}
            icon="google"
          >
            Google ile Giriş Yap
          </Button>

          {appleAuthAvailable && Platform.OS === 'ios' && (
            <Button
              mode="outlined"
              onPress={handleAppleLogin}
              disabled={loading}
              style={styles.socialButton}
              contentStyle={{ height: 48 }}
              icon="apple"
            >
              Apple ile Giriş Yap
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerButton}
          >
            Hesabın yok mu? Kayıt Ol
          </Button>
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
});
