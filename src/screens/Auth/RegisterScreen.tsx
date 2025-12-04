import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, Checkbox } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useLanguage } from '../../contexts/LanguageContext';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!validateName(fullName)) {
      Alert.alert(t('common.error'), t('auth.nameMinLength'));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert(t('common.error'), passwordValidation.message || t('auth.invalidPassword'));
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(t('common.error'), t('auth.mustAcceptTerms') || 'You must accept the Terms of Service and Community Guidelines');
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      Alert.alert(t('auth.registerError'), authError.message);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName.trim() || null,
      });

      setLoading(false);

      if (profileError) {
        Alert.alert(t('auth.profileError'), profileError.message);
      } else {
        Alert.alert(t('common.success'), t('auth.accountCreated'), [
          { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
        ]);
      }
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>{t('auth.register')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{t('auth.registerSubtitle')}</Text>

            <TextInput
              label={t('auth.fullName') + ' *'}
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label={t('auth.email') + ' *'}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label={t('auth.password') + ' *'}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              left={<TextInput.Icon icon="lock" />}
            />

            <View style={styles.termsContainer}>
              <Checkbox
                status={acceptedTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                color={theme.colors.primary}
              />
              <Text style={[styles.termsText, { color: theme.colors.onSurfaceVariant }]}>
                {t('auth.iAccept') || 'I accept the'}{' '}
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
                      ? 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/community-guidelines-tr.html'
                      : 'https://canakboyraz.github.io/sport-buddy-app/legal-docs/community-guidelines-en.html';
                    Linking.openURL(url);
                  }}
                >
                  {t('auth.communityGuidelines') || 'Community Guidelines'}
                </Text>
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading || !acceptedTerms}
              style={styles.button}
              contentStyle={{ height: 48 }}
            >
              {t('auth.register')}
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
            >
              {t('auth.alreadyHaveAccount')} {t('auth.login')}
            </Button>
          </Surface>
        </ScrollView>
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
  },
  scrollContainer: {
    flexGrow: 1,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});
