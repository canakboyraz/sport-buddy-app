import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text, Surface, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LanguageCode } from '../../i18n';

export default function LanguageSelectionScreen() {
  const { currentLanguage, changeLanguage, languages, t } = useLanguage();
  const { theme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(currentLanguage);
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    if (languageCode === currentLanguage) return;

    setSelectedLanguage(languageCode);
    setIsChanging(true);

    const success = await changeLanguage(languageCode);

    if (!success) {
      // Revert if failed
      setSelectedLanguage(currentLanguage);
    }

    setIsChanging(false);
  };

  const languageOptions: { code: LanguageCode; name: string; nativeName: string; flag: string; description: string }[] = [
    {
      code: 'tr',
      name: languages.tr.name,
      nativeName: languages.tr.nativeName,
      flag: languages.tr.flag,
      description: 'Türkiye',
    },
    {
      code: 'en',
      name: languages.en.name,
      nativeName: languages.en.nativeName,
      flag: languages.en.flag,
      description: 'International',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header Card */}
        <Surface style={styles.headerCard} elevation={2}>
          <LinearGradient
            colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerIconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                <MaterialCommunityIcons
                  name="translate"
                  size={48}
                  color={theme.colors.primary}
                />
              </View>
            </View>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              {t('language.title')}
            </Text>
            <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('language.subtitle')}
            </Text>
          </LinearGradient>
        </Surface>

        {/* Current Language Info */}
        <Surface style={styles.currentCard} elevation={1}>
          <LinearGradient
            colors={[theme.colors.secondary + '10', theme.colors.secondary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentGradient}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={theme.colors.secondary}
              style={styles.infoIcon}
            />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {t('language.current')}:{' '}
              <Text style={[styles.currentLanguageText, { color: theme.colors.primary }]}>
                {languages[currentLanguage].nativeName}
              </Text>
            </Text>
          </LinearGradient>
        </Surface>

        {/* Language Options */}
        <View style={styles.languagesContainer}>
          {languageOptions.map((language) => (
            <LanguageCard
              key={language.code}
              language={language}
              isSelected={selectedLanguage === language.code}
              onSelect={() => handleLanguageChange(language.code)}
              isDisabled={isChanging}
              theme={theme}
            />
          ))}
        </View>

        {/* Info Text */}
        <View style={styles.infoContainer}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={20}
            color={theme.colors.primary}
            style={styles.infoIconBottom}
          />
          <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
            {currentLanguage === 'tr'
              ? 'Dil değişikliği anında uygulanır ve tüm ekranları etkiler.'
              : 'Language change takes effect immediately and affects all screens.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

interface LanguageCardProps {
  language: {
    code: LanguageCode;
    name: string;
    nativeName: string;
    flag: string;
    description: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
  theme: any;
}

function LanguageCard({ language, isSelected, onSelect, isDisabled, theme }: LanguageCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.9}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Surface
          style={[
            styles.languageCard,
            isSelected && styles.languageCardSelected,
            { borderColor: isSelected ? theme.colors.primary : theme.colors.outline },
          ]}
          elevation={isSelected ? 3 : 1}
        >
          {isSelected && (
            <LinearGradient
              colors={[theme.colors.primary + '15', theme.colors.primary + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedGradient}
            />
          )}

          <View style={styles.languageCardContent}>
            <View style={styles.languageLeft}>
              <Text style={styles.flagEmoji}>{language.flag}</Text>
              <View style={styles.languageInfo}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.languageName,
                    { color: theme.colors.onSurface },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {language.nativeName}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {language.description}
                </Text>
              </View>
            </View>

            <View style={styles.languageRight}>
              {isSelected && (
                <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                </View>
              )}
              {!isSelected && (
                <View style={[styles.emptyCircle, { borderColor: theme.colors.outline }]} />
              )}
            </View>
          </View>
        </Surface>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  currentCard: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  currentGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 12,
  },
  currentLanguageText: {
    fontWeight: '700',
  },
  languagesContainer: {
    gap: 16,
  },
  languageCard: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  languageCardSelected: {
    borderWidth: 3,
  },
  selectedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  languageCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    marginBottom: 4,
  },
  languageRight: {
    marginLeft: 12,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    marginTop: 24,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIconBottom: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
});
