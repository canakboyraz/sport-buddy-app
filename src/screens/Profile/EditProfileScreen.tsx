import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, ActivityIndicator, HelperText } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { validateBio, validateName } from '../../utils/validation';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EditProfileScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [favoriteSports, setFavoriteSports] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
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
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setCity(data.city || '');
      setFavoriteSports(data.favorite_sports || '');
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      fullName: '',
      phone: '',
      bio: '',
    };

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = t('profile.fullNameRequired');
    } else if (!validateName(fullName)) {
      newErrors.fullName = t('profile.fullNameMinLength');
    }

    // Validate phone
    if (phone && !/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = t('validation.phone');
    }

    // Validate bio
    if (bio) {
      const bioValidation = validateBio(bio);
      if (!bioValidation.isValid) {
        newErrors.bio = bioValidation.message || '';
      }
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.phone && !newErrors.bio;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        favorite_sports: favoriteSports.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert(t('common.error'), t('profile.updateError'));
      console.error('Profile update error:', error);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TextInput
        label={`${t('profile.fullName')} *`}
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
        error={!!errors.fullName}
      />
      <HelperText type="error" visible={!!errors.fullName}>
        {errors.fullName}
      </HelperText>

      <TextInput
        label={t('profile.phone')}
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        placeholder={t('profile.phonePlaceholder')}
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <TextInput
        label={t('profile.city')}
        value={city}
        onChangeText={setCity}
        mode="outlined"
        style={styles.input}
        placeholder={t('profile.cityPlaceholder')}
      />

      <TextInput
        label={t('profile.favoriteSports')}
        value={favoriteSports}
        onChangeText={setFavoriteSports}
        mode="outlined"
        style={styles.input}
        placeholder={t('profile.favoriteSportsPlaceholder')}
        multiline
        numberOfLines={2}
      />

      <TextInput
        label={t('profile.bio')}
        value={bio}
        onChangeText={setBio}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder={t('profile.bioPlaceholder')}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      >
        {t('common.save')}
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        disabled={saving}
        style={styles.cancelButton}
      >
        {t('common.cancel')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 5,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
