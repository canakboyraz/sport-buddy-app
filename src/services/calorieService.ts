// Calorie estimation service
// Estimates calories burned per hour for different sports
// Based on average intensity for a 70kg person

export interface CalorieEstimate {
  caloriesPerHour: number;
  range: { min: number; max: number };
}

const SPORT_CALORIES: Record<string, CalorieEstimate> = {
  // Football/Soccer
  'Futbol': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Football': { caloriesPerHour: 600, range: { min: 500, max: 700 } },

  // Basketball
  'Basketbol': { caloriesPerHour: 550, range: { min: 450, max: 650 } },
  'Basketball': { caloriesPerHour: 550, range: { min: 450, max: 650 } },

  // Tennis
  'Tenis': { caloriesPerHour: 500, range: { min: 400, max: 600 } },
  'Tennis': { caloriesPerHour: 500, range: { min: 400, max: 600 } },

  // Volleyball
  'Voleybol': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Volleyball': { caloriesPerHour: 400, range: { min: 300, max: 500 } },

  // Running/Jogging
  'Koşu': { caloriesPerHour: 650, range: { min: 500, max: 800 } },
  'Running': { caloriesPerHour: 650, range: { min: 500, max: 800 } },
  'Jogging': { caloriesPerHour: 500, range: { min: 400, max: 600 } },

  // Cycling
  'Bisiklet': { caloriesPerHour: 500, range: { min: 400, max: 700 } },
  'Cycling': { caloriesPerHour: 500, range: { min: 400, max: 700 } },

  // Swimming
  'Yüzme': { caloriesPerHour: 600, range: { min: 500, max: 800 } },
  'Swimming': { caloriesPerHour: 600, range: { min: 500, max: 800 } },

  // Badminton
  'Badminton': { caloriesPerHour: 450, range: { min: 350, max: 550 } },

  // Table Tennis / Ping Pong
  'Masa Tenisi': { caloriesPerHour: 300, range: { min: 250, max: 400 } },
  'Table Tennis': { caloriesPerHour: 300, range: { min: 250, max: 400 } },
  'Ping Pong': { caloriesPerHour: 300, range: { min: 250, max: 400 } },

  // Padel
  'Padel': { caloriesPerHour: 500, range: { min: 400, max: 600 } },

  // Squash
  'Squash': { caloriesPerHour: 650, range: { min: 550, max: 750 } },

  // Martial Arts
  'Dövüş Sanatları': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Martial Arts': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Karate': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Taekwondo': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Judo': { caloriesPerHour: 650, range: { min: 550, max: 750 } },
  'Kickboks': { caloriesPerHour: 700, range: { min: 600, max: 800 } },
  'Kickboxing': { caloriesPerHour: 700, range: { min: 600, max: 800 } },
  'Boks': { caloriesPerHour: 700, range: { min: 600, max: 800 } },
  'Boxing': { caloriesPerHour: 700, range: { min: 600, max: 800 } },

  // Yoga & Pilates
  'Yoga': { caloriesPerHour: 200, range: { min: 150, max: 300 } },
  'Pilates': { caloriesPerHour: 250, range: { min: 200, max: 350 } },

  // Climbing
  'Tırmanma': { caloriesPerHour: 550, range: { min: 450, max: 650 } },
  'Climbing': { caloriesPerHour: 550, range: { min: 450, max: 650 } },
  'Kaya Tırmanışı': { caloriesPerHour: 600, range: { min: 500, max: 700 } },
  'Rock Climbing': { caloriesPerHour: 600, range: { min: 500, max: 700 } },

  // Dance
  'Dans': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Dance': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Zumba': { caloriesPerHour: 500, range: { min: 400, max: 600 } },

  // Walking/Hiking
  'Yürüyüş': { caloriesPerHour: 300, range: { min: 200, max: 400 } },
  'Walking': { caloriesPerHour: 300, range: { min: 200, max: 400 } },
  'Doğa Yürüyüşü': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Hiking': { caloriesPerHour: 400, range: { min: 300, max: 500 } },

  // Gym & Fitness
  'Fitness': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Gym': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
  'Ağırlık Çalışması': { caloriesPerHour: 350, range: { min: 250, max: 450 } },
  'Weight Training': { caloriesPerHour: 350, range: { min: 250, max: 450 } },
  'Crossfit': { caloriesPerHour: 600, range: { min: 500, max: 700 } },

  // Other Sports
  'Golf': { caloriesPerHour: 300, range: { min: 250, max: 400 } },
  'Bowling': { caloriesPerHour: 200, range: { min: 150, max: 250 } },
  'Okçuluk': { caloriesPerHour: 250, range: { min: 200, max: 300 } },
  'Archery': { caloriesPerHour: 250, range: { min: 200, max: 300 } },
  'Eskrim': { caloriesPerHour: 450, range: { min: 350, max: 550 } },
  'Fencing': { caloriesPerHour: 450, range: { min: 350, max: 550 } },

  // Default for unknown sports
  'default': { caloriesPerHour: 400, range: { min: 300, max: 500 } },
};

/**
 * Get estimated calories burned per hour for a specific sport
 */
export const getCalorieEstimate = (sportName: string): CalorieEstimate => {
  // Normalize sport name
  const normalizedName = sportName.trim();

  // Try exact match first
  if (SPORT_CALORIES[normalizedName]) {
    return SPORT_CALORIES[normalizedName];
  }

  // Try case-insensitive match
  const lowerCaseName = normalizedName.toLowerCase();
  const matchedKey = Object.keys(SPORT_CALORIES).find(
    key => key.toLowerCase() === lowerCaseName
  );

  if (matchedKey) {
    return SPORT_CALORIES[matchedKey];
  }

  // Return default if no match found
  return SPORT_CALORIES['default'];
};

/**
 * Format calorie estimate for display
 */
export const formatCalorieEstimate = (
  sportName: string,
  language: 'en' | 'tr' = 'tr'
): string => {
  const estimate = getCalorieEstimate(sportName);

  if (language === 'tr') {
    return `Tahmini ${estimate.range.min}-${estimate.range.max} kalori/saat`;
  } else {
    return `Estimated ${estimate.range.min}-${estimate.range.max} cal/hour`;
  }
};

/**
 * Get calorie burn icon based on intensity
 */
export const getCalorieIntensityIcon = (caloriesPerHour: number): string => {
  if (caloriesPerHour >= 600) return 'fire'; // High intensity
  if (caloriesPerHour >= 400) return 'fire-circle'; // Medium intensity
  return 'fire-off'; // Low intensity
};

/**
 * Get calorie burn color based on intensity
 */
export const getCalorieIntensityColor = (caloriesPerHour: number): string => {
  if (caloriesPerHour >= 600) return '#ff5722'; // Red-orange (high)
  if (caloriesPerHour >= 400) return '#ff9800'; // Orange (medium)
  return '#ffc107'; // Yellow (low)
};
