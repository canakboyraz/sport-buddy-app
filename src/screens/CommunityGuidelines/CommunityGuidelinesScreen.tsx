import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Checkbox, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  onAccept: () => void;
}

const GUIDELINES_CONSENT_KEY = '@guidelines_consent_accepted';

export default function CommunityGuidelinesScreen({ onAccept }: Props) {
  const { t } = useLanguage();
  const theme = useTheme();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;

    try {
      await AsyncStorage.setItem(GUIDELINES_CONSENT_KEY, 'true');
      onAccept();
    } catch (error) {
      console.error('Error saving guidelines consent:', error);
    }
  };

  const guidelines = [
    {
      icon: 'account-heart',
      title: t('guidelines.respectTitle'),
      description: t('guidelines.respectDesc'),
      color: '#4CAF50',
    },
    {
      icon: 'shield-check',
      title: t('guidelines.safetyTitle'),
      description: t('guidelines.safetyDesc'),
      color: '#2196F3',
    },
    {
      icon: 'message-alert',
      title: t('guidelines.appropriateTitle'),
      description: t('guidelines.appropriateDesc'),
      color: '#FF9800',
    },
    {
      icon: 'account-off',
      title: t('guidelines.noSpamTitle'),
      description: t('guidelines.noSpamDesc'),
      color: '#F44336',
    },
    {
      icon: 'gavel',
      title: t('guidelines.followLawsTitle'),
      description: t('guidelines.followLawsDesc'),
      color: '#9C27B0',
    },
  ];

  const consequences = [
    t('guidelines.consequences.warning'),
    t('guidelines.consequences.contentRemoval'),
    t('guidelines.consequences.suspension'),
    t('guidelines.consequences.permanentBan'),
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="shield-account"
            size={80}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>{t('guidelines.title')}</Text>
          <Text style={styles.subtitle}>{t('guidelines.subtitle')}</Text>
        </View>

        {/* Guidelines List */}
        <Card style={styles.guidelinesCard} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionTitle}>{t('guidelines.rulesTitle')}</Text>
            {guidelines.map((guideline, index) => (
              <View key={index} style={styles.guidelineItem}>
                <View style={[styles.iconCircle, { backgroundColor: guideline.color + '20' }]}>
                  <MaterialCommunityIcons
                    name={guideline.icon as any}
                    size={28}
                    color={guideline.color}
                  />
                </View>
                <View style={styles.guidelineText}>
                  <Text style={styles.guidelineTitle}>{guideline.title}</Text>
                  <Text style={styles.guidelineDescription}>{guideline.description}</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Consequences */}
        <Card style={styles.consequencesCard} mode="elevated">
          <Card.Content>
            <View style={styles.consequencesHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#F44336" />
              <Text style={styles.sectionTitle}>{t('guidelines.violationTitle')}</Text>
            </View>
            <Text style={styles.consequencesIntro}>{t('guidelines.violationIntro')}</Text>
            {consequences.map((consequence, index) => (
              <View key={index} style={styles.consequenceItem}>
                <MaterialCommunityIcons name="circle-medium" size={20} color="#F44336" />
                <Text style={styles.consequenceText}>{consequence}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Report Reminder */}
        <Card style={styles.reportCard} mode="elevated">
          <Card.Content>
            <View style={styles.reportHeader}>
              <MaterialCommunityIcons name="flag" size={24} color="#2196F3" />
              <Text style={styles.reportTitle}>{t('guidelines.reportTitle')}</Text>
            </View>
            <Text style={styles.reportText}>{t('guidelines.reportDesc')}</Text>
          </Card.Content>
        </Card>

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
            {t('guidelines.acceptText')}
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
          {t('guidelines.continue')}
        </Button>
      </View>
    </View>
  );
}

export const checkGuidelinesConsent = async (): Promise<boolean> => {
  try {
    const consent = await AsyncStorage.getItem(GUIDELINES_CONSENT_KEY);
    return consent === 'true';
  } catch (error) {
    console.error('Error checking guidelines consent:', error);
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
  guidelinesCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 8,
  },
  guidelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelineText: {
    flex: 1,
    marginLeft: 16,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  guidelineDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  consequencesCard: {
    marginBottom: 16,
    backgroundColor: '#FFEBEE',
  },
  consequencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consequencesIntro: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  consequenceText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  reportCard: {
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  reportText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
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
    fontWeight: '500',
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
