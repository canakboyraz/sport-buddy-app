import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, ActivityIndicator, HelperText, Surface, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { validateBio, validateName } from '../../utils/validation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = usePaperTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [favoriteSports, setFavoriteSports] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setLoading(false);

    if (!error && data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setBio(data.bio || '');
      setCity(data.city || '');
      setFavoriteSports(data.favorite_sports || '');
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      fullName: '',
      bio: '',
    };

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = t('profile.fullNameRequired');
    } else if (!validateName(fullName)) {
      newErrors.fullName = t('profile.fullNameMinLength');
    }

    // Validate bio
    if (bio) {
      const bioValidation = validateBio(bio);
      if (!bioValidation.isValid) {
        newErrors.bio = bioValidation.message || '';
      }
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.bio;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) return;

    setSaving(true);

    console.log('[EditProfile] Updating profile with:', {
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      city: city.trim() || null,
      favorite_sports: favoriteSports.trim() || null,
    });

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        favorite_sports: favoriteSports.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select();

    setSaving(false);

    console.log('[EditProfile] Update result:', { data, error });

    if (error) {
      Alert.alert(t('common.error'), t('profile.updateError'));
      console.error('[EditProfile] Profile update error:', error);
    } else {
      Alert.alert(t('common.success'), t('profile.updateSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={
          isDarkMode
            ? [theme.colors.background, theme.colors.background]
            : [theme.colors.primaryContainer + '40', theme.colors.background]
        }
        style={styles.gradient}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="account-edit" size={48} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>{t('profile.editProfile')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('profile.editProfileSubtitle')}
            </Text>
          </View>

          {/* Form Card */}
          <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  {t('profile.fullName')} *
                </Text>
              </View>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                error={!!errors.fullName}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
                left={<TextInput.Icon icon="account" color={theme.colors.onSurfaceVariant} />}
              />
              <HelperText type="error" visible={!!errors.fullName} style={{ color: theme.colors.error }}>
                {errors.fullName}
              </HelperText>
            </View>

            {/* City */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  {t('profile.city')}
                </Text>
              </View>
              <TextInput
                value={city}
                onChangeText={setCity}
                mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                placeholder={t('profile.cityPlaceholder')}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                left={<TextInput.Icon icon="map-marker" color={theme.colors.onSurfaceVariant} />}
              />
            </View>

            {/* Favorite Sports */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <MaterialCommunityIcons name="basketball" size={20} color={theme.colors.primary} />
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  {t('profile.favoriteSports')}
                </Text>
              </View>
              <TextInput
                value={favoriteSports}
                onChangeText={setFavoriteSports}
                mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                placeholder={t('profile.favoriteSportsPlaceholder')}
                multiline
                numberOfLines={2}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                left={<TextInput.Icon icon="basketball" color={theme.colors.onSurfaceVariant} />}
              />
            </View>

            {/* Bio */}
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <MaterialCommunityIcons name="text" size={20} color={theme.colors.primary} />
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  {t('profile.bio')}
                </Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={setBio}
                mode="outlined"
                style={[styles.input, styles.bioInput, { backgroundColor: theme.colors.surface }]}
                multiline
                numberOfLines={5}
                placeholder={t('profile.bioPlaceholder')}
                error={!!errors.bio}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                left={<TextInput.Icon icon="text" color={theme.colors.onSurfaceVariant} />}
              />
              <HelperText type="error" visible={!!errors.bio} style={{ color: theme.colors.error }}>
                {errors.bio}
              </HelperText>
              <HelperText type="info" visible={!errors.bio} style={{ color: theme.colors.onSurfaceVariant }}>
                {t('profile.bioHelper')}
              </HelperText>
            </View>
          </Surface>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              contentStyle={{ height: 52 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              icon="check"
            >
              {t('common.save')}
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={[styles.cancelButton, { borderColor: theme.colors.outline }]}
              contentStyle={{ height: 52 }}
              labelStyle={{ fontSize: 16, fontWeight: '600', color: theme.colors.onSurface }}
              icon="close"
            >
              {t('common.cancel')}
            </Button>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
  },
  bioInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
    elevation: 2,
  },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 2,
  },
});
