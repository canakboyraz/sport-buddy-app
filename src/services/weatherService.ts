import axios from 'axios';

// OpenWeatherMap API
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  condition: string; // clear, clouds, rain, snow, etc.
  icon: string;
  sunrise?: number;
  sunset?: number;
}

export interface WeatherForecast {
  date: string;
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  description: string;
  condition: string;
  icon: string;
}

export interface WeatherWarning {
  type: 'hot' | 'cold' | 'rain' | 'storm' | 'good';
  message: string;
  icon: string;
}

/**
 * Get current weather by coordinates
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
  language: 'tr' | 'en' = 'tr'
): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric', // Celsius
        lang: language,
      },
      timeout: 10000,
    });

    const data = response.data;

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      description: data.weather[0].description,
      condition: data.weather[0].main.toLowerCase(),
      icon: data.weather[0].icon,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
    };
  } catch (error) {
    console.error('Error fetching current weather:', error);
    return null;
  }
}

/**
 * Get weather forecast by coordinates for a specific date
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  targetDate: Date,
  language: 'tr' | 'en' = 'tr'
): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    return null;
  }

  try {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: language,
      },
      timeout: 10000,
    });

    const forecasts = response.data.list;

    // Find the forecast closest to the target date
    const targetTime = targetDate.getTime();
    let closestForecast = forecasts[0];
    let minDiff = Math.abs(new Date(forecasts[0].dt * 1000).getTime() - targetTime);

    for (const forecast of forecasts) {
      const forecastTime = new Date(forecast.dt * 1000).getTime();
      const diff = Math.abs(forecastTime - targetTime);

      if (diff < minDiff) {
        minDiff = diff;
        closestForecast = forecast;
      }
    }

    return {
      temperature: Math.round(closestForecast.main.temp),
      feelsLike: Math.round(closestForecast.main.feels_like),
      humidity: closestForecast.main.humidity,
      windSpeed: Math.round(closestForecast.wind.speed * 3.6),
      description: closestForecast.weather[0].description,
      condition: closestForecast.weather[0].main.toLowerCase(),
      icon: closestForecast.weather[0].icon,
    };
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return null;
  }
}

/**
 * Get 5-day weather forecast
 */
export async function get5DayForecast(
  latitude: number,
  longitude: number,
  language: 'tr' | 'en' = 'tr'
): Promise<WeatherForecast[]> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured');
    return [];
  }

  try {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: language,
      },
      timeout: 10000,
    });

    const forecasts = response.data.list;
    const dailyForecasts: WeatherForecast[] = [];
    const processedDates = new Set<string>();

    for (const forecast of forecasts) {
      const date = new Date(forecast.dt * 1000);
      const dateString = date.toISOString().split('T')[0];

      // Take one forecast per day (around noon)
      if (!processedDates.has(dateString) && date.getHours() >= 11 && date.getHours() <= 14) {
        processedDates.add(dateString);
        dailyForecasts.push({
          date: dateString,
          temperature: Math.round(forecast.main.temp),
          minTemperature: Math.round(forecast.main.temp_min),
          maxTemperature: Math.round(forecast.main.temp_max),
          description: forecast.weather[0].description,
          condition: forecast.weather[0].main.toLowerCase(),
          icon: forecast.weather[0].icon,
        });

        if (dailyForecasts.length >= 5) break;
      }
    }

    return dailyForecasts;
  } catch (error) {
    console.error('Error fetching 5-day forecast:', error);
    return [];
  }
}

/**
 * Get weather warnings based on conditions
 */
export function getWeatherWarnings(weather: WeatherData, language: 'tr' | 'en' = 'tr'): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];

  // Hot weather warning (>35°C)
  if (weather.temperature > 35) {
    warnings.push({
      type: 'hot',
      message: language === 'tr'
        ? '🌡️ Dikkat: Çok sıcak! Bol su için'
        : '🌡️ Warning: Very hot! Stay hydrated',
      icon: 'weather-sunny-alert',
    });
  }

  // Cold weather warning (<5°C)
  if (weather.temperature < 5) {
    warnings.push({
      type: 'cold',
      message: language === 'tr'
        ? '❄️ Dikkat: Çok soğuk! Sıkı giyinin'
        : '❄️ Warning: Very cold! Dress warmly',
      icon: 'snowflake-alert',
    });
  }

  // Rain warning
  if (weather.condition.includes('rain') || weather.condition.includes('drizzle')) {
    warnings.push({
      type: 'rain',
      message: language === 'tr'
        ? '🌧️ Yağmur bekleniyor'
        : '🌧️ Rain expected',
      icon: 'weather-pouring',
    });
  }

  // Storm warning
  if (weather.condition.includes('thunderstorm') || weather.condition.includes('storm')) {
    warnings.push({
      type: 'storm',
      message: language === 'tr'
        ? '⛈️ Fırtına uyarısı!'
        : '⛈️ Storm warning!',
      icon: 'weather-lightning',
    });
  }

  // Good weather message
  if (warnings.length === 0 && weather.temperature >= 15 && weather.temperature <= 28) {
    warnings.push({
      type: 'good',
      message: language === 'tr'
        ? '☀️ Harika hava! İyi eğlenceler'
        : '☀️ Great weather! Have fun',
      icon: 'weather-sunny',
    });
  }

  return warnings;
}

/**
 * Get weather icon name for React Native Paper
 */
export function getWeatherIconName(condition: string, icon?: string): string {
  const isNight = icon?.includes('n');

  switch (condition.toLowerCase()) {
    case 'clear':
      return isNight ? 'weather-night' : 'weather-sunny';
    case 'clouds':
      return isNight ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy';
    case 'rain':
      return 'weather-rainy';
    case 'drizzle':
      return 'weather-partly-rainy';
    case 'thunderstorm':
      return 'weather-lightning-rainy';
    case 'snow':
      return 'weather-snowy';
    case 'mist':
    case 'fog':
      return 'weather-fog';
    case 'haze':
      return 'weather-hazy';
    case 'smoke':
      return 'weather-fog';
    default:
      return 'weather-cloudy';
  }
}

/**
 * Get temperature emoji
 */
export function getTemperatureEmoji(temperature: number): string {
  if (temperature >= 30) return '🔥';
  if (temperature >= 20) return '☀️';
  if (temperature >= 10) return '🌤️';
  if (temperature >= 0) return '⛅';
  return '❄️';
}

/**
 * Get clothing recommendation based on temperature
 */
export function getClothingRecommendation(temperature: number, language: 'tr' | 'en' = 'tr'): string {
  if (language === 'tr') {
    if (temperature >= 30) return 'Hafif kıyafetler, şapka, güneş gözlüğü';
    if (temperature >= 20) return 'Spor kıyafet, su şişesi';
    if (temperature >= 10) return 'Eşofman, hafif mont';
    if (temperature >= 0) return 'Kalın eşofman, mont, eldiven';
    return 'Çok kalın kıyafetler, bere, atkı, eldiven';
  } else {
    if (temperature >= 30) return 'Light clothing, hat, sunglasses';
    if (temperature >= 20) return 'Sportswear, water bottle';
    if (temperature >= 10) return 'Tracksuit, light jacket';
    if (temperature >= 0) return 'Warm tracksuit, jacket, gloves';
    return 'Very warm clothing, beanie, scarf, gloves';
  }
}
