import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getWeatherForecast,
  getCurrentWeather,
  WeatherData,
  getWeatherWarnings,
  getWeatherIconName,
  getTemperatureEmoji,
  getClothingRecommendation,
} from '../services/weatherService';

interface WeatherCardProps {
  latitude?: number;
  longitude?: number;
  sessionDate?: Date;
  compact?: boolean;
}

export default function WeatherCard({ latitude, longitude, sessionDate, compact = false }: WeatherCardProps) {
  const { theme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (latitude && longitude) {
      loadWeather();
    }
  }, [latitude, longitude, sessionDate]);

  const loadWeather = async () => {
    if (!latitude || !longitude) return;

    setLoading(true);
    setError(false);

    try {
      let weatherData: WeatherData | null = null;

      if (sessionDate) {
        // Get forecast for session date
        weatherData = await getWeatherForecast(latitude, longitude, sessionDate, currentLanguage);
      } else {
        // Get current weather
        weatherData = await getCurrentWeather(latitude, longitude, currentLanguage);
      }

      if (weatherData) {
        setWeather(weatherData);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error loading weather:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!latitude || !longitude) {
    return null;
  }

  if (loading) {
    return (
      <Surface style={styles.card} elevation={2}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Text variant="bodySmall" style={{ marginLeft: 8, color: theme.colors.onSurface }}>
            {t('weather.loading')}
          </Text>
        </View>
      </Surface>
    );
  }

  if (error || !weather) {
    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.error} />
          <Text variant="bodySmall" style={{ marginLeft: 8, color: theme.colors.error }}>
            {t('weather.error')}
          </Text>
        </View>
      </Surface>
    );
  }

  const warnings = getWeatherWarnings(weather, currentLanguage);
  const iconName = getWeatherIconName(weather.condition, weather.icon);
  const temperatureEmoji = getTemperatureEmoji(weather.temperature);
  const clothingRecommendation = getClothingRecommendation(weather.temperature, currentLanguage);

  if (compact) {
    return (
      <Surface style={styles.compactCard} elevation={1}>
        <LinearGradient
          colors={[theme.colors.primary + '10', theme.colors.primary + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactContent}>
            <MaterialCommunityIcons name={iconName as any} size={32} color={theme.colors.primary} />
            <View style={styles.compactInfo}>
              <Text variant="titleMedium" style={[styles.temperature, { color: theme.colors.onSurface }]}>
                {weather.temperature}°C {temperatureEmoji}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {weather.description}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Surface>
    );
  }

  return (
    <Surface style={styles.card} elevation={2}>
      <LinearGradient
        colors={[theme.colors.primary + '12', theme.colors.primary + '06']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]}>
              {sessionDate ? t('weather.atSessionTime') : t('weather.current')}
            </Text>
          </View>
        </View>

        {/* Main Weather Info */}
        <View style={styles.mainInfo}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <MaterialCommunityIcons name={iconName as any} size={64} color={theme.colors.primary} />
          </View>

          <View style={styles.tempContainer}>
            <Text variant="displaySmall" style={[styles.mainTemp, { color: theme.colors.onSurface }]}>
              {weather.temperature}°C
            </Text>
            <Text variant="titleMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              {temperatureEmoji} {weather.description}
            </Text>
          </View>
        </View>

        {/* Weather Details */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="thermometer" size={20} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t('weather.feelsLike')}
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {weather.feelsLike}°C
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="water-percent" size={20} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t('weather.humidity')}
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {weather.humidity}%
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weather-windy" size={20} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {t('weather.wind')}
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {weather.windSpeed} km/h
            </Text>
          </View>
        </View>

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            {warnings.map((warning, index) => (
              <View
                key={index}
                style={[
                  styles.warningItem,
                  {
                    backgroundColor:
                      warning.type === 'good'
                        ? '#4caf50' + '15'
                        : warning.type === 'rain'
                        ? '#2196f3' + '15'
                        : '#ff9800' + '15',
                  },
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurface,
                    flex: 1,
                  }}
                >
                  {warning.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Clothing Recommendation */}
        <View style={[styles.recommendationContainer, { backgroundColor: theme.colors.primary + '10' }]}>
          <MaterialCommunityIcons name="tshirt-crew" size={20} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 8, flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{t('weather.recommendedClothing')}: </Text>
            {clothingRecommendation}
          </Text>
        </View>
      </LinearGradient>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  gradient: {
    padding: 20,
  },
  compactGradient: {
    padding: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    fontWeight: '700',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tempContainer: {
    flex: 1,
  },
  mainTemp: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    textTransform: 'capitalize',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  warningsContainer: {
    marginTop: 8,
    gap: 8,
  },
  warningItem: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  temperature: {
    fontWeight: '700',
  },
});
