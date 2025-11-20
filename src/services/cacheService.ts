import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_KEYS = {
    SPORTS: 'sports_cache',
    CITIES: 'cities_cache',
    SESSIONS: 'sessions_cache',
};

export const CACHE_TTL = {
    VERY_LONG: 60 * 60 * 24 * 7, // 1 week
    LONG: 60 * 60 * 24, // 1 day
    MEDIUM: 60 * 60, // 1 hour
    SHORT: 60 * 15, // 15 minutes
};

export const cacheService = {
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const item = await AsyncStorage.getItem(key);
            if (!item) return null;
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) {
                await AsyncStorage.removeItem(key);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    },
    getStale: async <T>(key: string): Promise<{ data: T | null; isStale: boolean }> => {
        try {
            const item = await AsyncStorage.getItem(key);
            if (!item) return { data: null, isStale: true };
            const parsed = JSON.parse(item);
            return { data: parsed.data, isStale: Date.now() > parsed.expiry };
        } catch (e) {
            return { data: null, isStale: true };
        }
    },
    set: async (key: string, data: any, ttlSeconds: number) => {
        try {
            const expiry = Date.now() + ttlSeconds * 1000;
            await AsyncStorage.setItem(key, JSON.stringify({ data, expiry }));
        } catch (e) {
            console.error('Cache set error', e);
        }
    },
};
