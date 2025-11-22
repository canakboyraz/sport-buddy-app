import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import {
  formatCalorieEstimate,
  getCalorieIntensityIcon,
  getCalorieIntensityColor,
} from '../services/calorieService';

interface WeatherCardProps {
  latitude?: number;
  longitude?: number;
  sessionDate?: Date;
  compact?: boolean;
  sportName?: string;
}

export default function WeatherCard({ latitude, longitude, sessionDate, compact = false, sportName }: WeatherCardProps) {
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
      <Surface style={[styles.compactCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.compactGradient}>
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
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <View style={styles.compactWeatherContainer}>
        {/* Header */}
        <View style={styles.compactHeader}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color={theme.colors.primary} />
          <Text variant="titleSmall" style={[styles.compactTitle, { color: theme.colors.primary }]}>
            {sessionDate ? t('weather.atSessionTime') : t('weather.current')}
          </Text>
        </View>

        {/* Main Weather Info - Compact */}
        <View style={styles.compactMainInfo}>
          <MaterialCommunityIcons name={iconName as any} size={40} color={theme.colors.primary} />

          <View style={styles.compactTempContainer}>
            <Text variant="headlineSmall" style={[styles.compactTemp, { color: theme.colors.onSurface }]}>
              {weather.temperature}°C
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {temperatureEmoji} {weather.description}
            </Text>
          </View>
        </View>

        {/* Weather Details - Compact Row */}
        <View style={styles.compactDetailsRow}>
          <View style={styles.compactDetailItem}>
            <MaterialCommunityIcons name="thermometer" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 4 }}>
              {weather.feelsLike}°C
            </Text>
          </View>

          <View style={styles.compactDetailItem}>
            <MaterialCommunityIcons name="water-percent" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 4 }}>
              {weather.humidity}%
            </Text>
          </View>

          <View style={styles.compactDetailItem}>
            <MaterialCommunityIcons name="weather-windy" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 4 }}>
              {weather.windSpeed} km/h
            </Text>
          </View>
        </View>

        {/* Warnings - Compact */}
        {warnings.length > 0 && (
          <View style={styles.compactWarningsContainer}>
            {warnings.map((warning, index) => (
              <View
                key={index}
                style={[
                  styles.compactWarningItem,
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
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                  {warning.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Clothing Recommendation - Compact */}
        <View style={[styles.compactRecommendation, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="tshirt-crew" size={16} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 6, flex: 1 }}>
            {clothingRecommendation}
          </Text>
        </View>

        {/* Calorie Estimate */}
        {sportName && (
          <View style={[styles.compactRecommendation, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name={getCalorieIntensityIcon(0) as any}
              size={16}
              color={getCalorieIntensityColor(400)}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 6, flex: 1 }}>
              {formatCalorieEstimate(sportName, currentLanguage)}
            </Text>
          </View>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
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
  // New compact weather container styles
  compactWeatherContainer: {
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    marginLeft: 6,
    fontWeight: '600',
  },
  compactMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactTempContainer: {
    marginLeft: 12,
    flex: 1,
  },
  compactTemp: {
    fontWeight: '700',
  },
  compactDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 6,
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactWarningsContainer: {
    marginTop: 6,
    gap: 6,
  },
  compactWarningItem: {
    padding: 8,
    borderRadius: 6,
  },
  compactRecommendation: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
