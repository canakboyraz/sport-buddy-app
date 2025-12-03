# AI Session Hatası Düzeltme Kılavuzu

## Sorun
`ERROR [HomeScreen] loadSessions error: {"message": "{\""}` hatası alınıyor.

Bu hata, veritabanında AI tarafından oluşturulmuş session'larda geçersiz karakter/format olması nedeniyle oluşuyor.

## Çözüm

### Adım 1: Problematik Session'ları Bul

Supabase Studio'ya git (https://supabase.com/dashboard) ve SQL Editor'da şu sorguyu çalıştır:

```sql
-- Problematik title veya description içeren session'ları bul
SELECT
  id,
  title,
  description,
  created_at,
  LENGTH(title) as title_length,
  LENGTH(description) as desc_length
FROM sport_sessions
WHERE
  -- Geçersiz escape karakterleri
  title LIKE '%\\"%'
  OR title LIKE '%\\n%'
  OR title LIKE '%\\r%'
  OR title LIKE '%\\t%'
  OR description LIKE '%\\"%'
  OR description LIKE '%\\n%'
  OR description LIKE '%\\r%'
  OR description LIKE '%\\t%'
ORDER BY created_at DESC
LIMIT 50;
```

### Adım 2: Son AI ile Oluşturulan Session'ları Göster

```sql
-- Son 24 saat içinde oluşturulan session'ları göster
SELECT
  id,
  title,
  LEFT(description, 100) as desc_preview,
  created_at
FROM sport_sessions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Adım 3: Problematik Session'ları Temizle

**UYARI:** Bu sorguyu çalıştırmadan önce yukarıdaki sorgularla hangi kayıtların silineceğini kontrol edin!

```sql
-- Yalnızca son 1 saat içinde oluşturulan ve problematik session'ları sil
DELETE FROM sport_sessions
WHERE
  created_at > NOW() - INTERVAL '1 hour'
  AND (
    title LIKE '%\\"%'
    OR description LIKE '%\\"%'
  );
```

### Adım 4: Tüm Session'ları Temizle (İsteğe Bağlı - TEST İçin)

**UYARI:** Bu tüm session'ları silecek! Sadece test/development ortamında kullanın!

```sql
-- TÜM session'ları sil (sadece test için!)
DELETE FROM sport_sessions;
```

## Kod Düzeltmeleri

Aşağıdaki düzeltmeler zaten yapıldı:

### 1. `aiService.ts` - Güvenli JSON Parsing

✅ `generateSessionContent()` fonksiyonunda try-catch ile JSON parsing koruması eklendi
✅ `moderateContentWithAI()` fonksiyonunda try-catch ile JSON parsing koruması eklendi
✅ Null byte temizleme eklendi

### 2. `HomeScreen.tsx` - Detaylı Error Logging

✅ Error details logging eklendi (message, details, hint, code)

### 3. AI Prompt Güncellemesi (İsteğe Bağlı)

Eğer problem devam ederse, AI'ya daha net talimatlar verebiliriz:

```typescript
// aiService.ts - generateSessionContent() içinde
const prompt = language === 'tr'
  ? `Bir spor seansı için çekici başlık ve açıklama yaz.

ÖNEMLI: Sadece düz metin kullan. Özel karakterler kullanma (\\, ", etc.)
JSON tırnak işaretlerini escape etme - düz metin kullan.

...`
```

## Test

Düzeltmelerden sonra:

1. Uygulamayı yeniden başlat
2. Yeni bir session oluştur
3. AI ile title ve description oluştur
4. Home ekranını yenile
5. Hata devam ediyorsa, Supabase SQL Editor'dan session'ları kontrol et

## Kalıcı Çözüm

İleride bu tür sorunları önlemek için:

1. ✅ AI service'de güvenli JSON parsing (yapıldı)
2. ✅ Null byte temizleme (yapıldı)
3. ✅ Detaylı error logging (yapıldı)
4. 🔄 PostgreSQL trigger ile otomatik temizleme (opsiyonel)

---

**Not:** Kod düzeltmeleri zaten yapıldı. Sadece veritabanındaki mevcut problematik kayıtları temizlemeniz gerekiyor.
