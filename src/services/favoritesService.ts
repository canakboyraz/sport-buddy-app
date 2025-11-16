import { supabase } from './supabase';

/**
 * Bir seansı favorilere ekle
 */
export async function addToFavorites(userId: string, sessionId: number) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        session_id: sessionId,
      })
      .select()
      .single();

    if (error) {
      // Duplicate key hatası (zaten favorilerde)
      if (error.code === '23505') {
        return { success: true, message: 'Zaten favorilerde' };
      }
      console.error('Favorilere ekleme hatası:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Favorilere ekleme hatası:', error);
    return { success: false, error };
  }
}

/**
 * Bir seansı favorilerden çıkar
 */
export async function removeFromFavorites(userId: string, sessionId: number) {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Favorilerden çıkarma hatası:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Favorilerden çıkarma hatası:', error);
    return { success: false, error };
  }
}

/**
 * Bir seansın favori olup olmadığını kontrol et
 */
export async function isFavorite(userId: string, sessionId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Kullanıcının tüm favorilerini getir
 */
export async function getUserFavorites(userId: string) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        session:sport_sessions(
          *,
          creator:profiles!sport_sessions_creator_id_fkey(*),
          sport:sports(*),
          participants:session_participants(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Favoriler yükleme hatası:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Favoriler yükleme hatası:', error);
    return { success: false, error };
  }
}

/**
 * Bir seansı kayıtlı etkinliklere ekle
 */
export async function addToSavedSessions(userId: string, sessionId: number, notes?: string) {
  try {
    const { data, error } = await supabase
      .from('saved_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // Duplicate key hatası (zaten kayıtlıda)
      if (error.code === '23505') {
        return { success: true, message: 'Zaten kayıtlı' };
      }
      console.error('Kayıtlılara ekleme hatası:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Kayıtlılara ekleme hatası:', error);
    return { success: false, error };
  }
}

/**
 * Bir seansı kayıtlı etkinliklerden çıkar
 */
export async function removeFromSavedSessions(userId: string, sessionId: number) {
  try {
    const { error } = await supabase
      .from('saved_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Kayıtlılardan çıkarma hatası:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Kayıtlılardan çıkarma hatası:', error);
    return { success: false, error };
  }
}

/**
 * Kayıtlı seans notunu güncelle
 */
export async function updateSavedSessionNotes(userId: string, sessionId: number, notes: string) {
  try {
    const { error } = await supabase
      .from('saved_sessions')
      .update({ notes })
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Not güncelleme hatası:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Not güncelleme hatası:', error);
    return { success: false, error };
  }
}

/**
 * Bir seansın kayıtlı olup olmadığını kontrol et
 */
export async function isSaved(userId: string, sessionId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('saved_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Kullanıcının tüm kayıtlı seanslarını getir
 */
export async function getUserSavedSessions(userId: string) {
  try {
    const { data, error } = await supabase
      .from('saved_sessions')
      .select(`
        *,
        session:sport_sessions(
          *,
          creator:profiles!sport_sessions_creator_id_fkey(*),
          sport:sports(*),
          participants:session_participants(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Kayıtlılar yükleme hatası:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Kayıtlılar yükleme hatası:', error);
    return { success: false, error };
  }
}
