import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { Text, Button, Checkbox, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  onAccept: () => void;
}

const PRIVACY_CONSENT_KEY = '@privacy_consent_accepted';

export default function PrivacyConsentScreen({ onAccept }: Props) {
  const { t, currentLanguage } = useLanguage();
  const theme = useTheme();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;

    try {
      await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, 'true');
      onAccept();
    } catch (error) {
      console.error('Error saving privacy consent:', error);
    }
  };

  const openPrivacyPolicy = () => {
    const url = currentLanguage === 'tr'
      ? 'https://canakboyraz.github.io/sport-buddy-privacy/privacy-policy-tr.html'
      : 'https://canakboyraz.github.io/sport-buddy-privacy/privacy-policy-en.html';
    Linking.openURL(url);
  };

  const openTerms = () => {
    const url = currentLanguage === 'tr'
      ? 'https://canakboyraz.github.io/sport-buddy-privacy/terms-of-service-tr.html'
      : 'https://canakboyraz.github.io/sport-buddy-privacy/terms-of-service-en.html';
    Linking.openURL(url);
  };

  const dataCollection = [
    {
      icon: 'account-circle',
      title: t('privacyConsent.dataTypes.profile'),
      description: t('privacyConsent.dataTypes.profileDesc'),
    },
    {
      icon: 'map-marker',
      title: t('privacyConsent.dataTypes.location'),
      description: t('privacyConsent.dataTypes.locationDesc'),
    },
    {
      icon: 'message-text',
      title: t('privacyConsent.dataTypes.messages'),
      description: t('privacyConsent.dataTypes.messagesDesc'),
    },
    {
      icon: 'camera',
      title: t('privacyConsent.dataTypes.photos'),
      description: t('privacyConsent.dataTypes.photosDesc'),
    },
    {
      icon: 'bell',
      title: t('privacyConsent.dataTypes.notifications'),
      description: t('privacyConsent.dataTypes.notificationsDesc'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="shield-check"
            size={80}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>{t('privacyConsent.title')}</Text>
          <Text style={styles.subtitle}>{t('privacyConsent.subtitle')}</Text>
        </View>

        {/* Data Collection Info */}
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>{t('privacyConsent.dataWeCollect')}</Text>
            {dataCollection.map((item, index) => (
              <View key={index} style={styles.dataItem}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.dataText}>
                  <Text style={styles.dataTitle}>{item.title}</Text>
                  <Text style={styles.dataDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Safety & Moderation */}
        <Card style={styles.safetyCard} mode="elevated">
          <Card.Content>
            <View style={styles.safetyHeader}>
              <MaterialCommunityIcons
                name="shield-account"
                size={28}
                color="#4CAF50"
              />
              <Text style={styles.sectionTitle}>{t('privacyConsent.safetyTitle')}</Text>
            </View>
            <Text style={styles.safetyText}>{t('privacyConsent.safetyDesc')}</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>{t('privacyConsent.features.report')}</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>{t('privacyConsent.features.block')}</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>{t('privacyConsent.features.moderation')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Your Rights */}
        <Card style={styles.rightsCard} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>{t('privacyConsent.yourRights')}</Text>
            <Text style={styles.rightsText}>{t('privacyConsent.rightsDesc')}</Text>
          </Card.Content>
        </Card>

        {/* Links */}
        <View style={styles.linksContainer}>
          <Button
            mode="text"
            onPress={openPrivacyPolicy}
            icon="file-document"
          >
            {t('privacyConsent.readPrivacyPolicy')}
          </Button>
          <Button
            mode="text"
            onPress={openTerms}
            icon="file-document-outline"
          >
            {t('privacyConsent.readTerms')}
          </Button>
        </View>

        {/* Checkbox */}
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={accepted ? 'checked' : 'unchecked'}
            onPress={() => setAccepted(!accepted)}
            color={theme.colors.primary}
          />
          <Text
            style={styles.checkboxText}
            onPress={() => setAccepted(!accepted)}
          >
            {t('privacyConsent.acceptText')}
          </Text>
        </View>
      </ScrollView>

      {/* Accept Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleAccept}
          disabled={!accepted}
          style={styles.acceptButton}
          contentStyle={styles.acceptButtonContent}
        >
          {t('privacyConsent.continue')}
        </Button>
      </View>
    </View>
  );
}

export const checkPrivacyConsent = async (): Promise<boolean> => {
  try {
    const consent = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY);
    return consent === 'true';
  } catch (error) {
    console.error('Error checking privacy consent:', error);
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  dataText: {
    flex: 1,
    marginLeft: 12,
  },
  dataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dataDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  safetyCard: {
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  safetyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  rightsCard: {
    marginBottom: 16,
  },
  rightsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  linksContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  acceptButton: {
    borderRadius: 8,
  },
  acceptButtonContent: {
    paddingVertical: 8,
  },
});
