# Google Maps API Key Kurulumu

## 1. Google Cloud Console'a Giriş

1. https://console.cloud.google.com adresine git
2. Google hesabınla giriş yap

## 2. Yeni Proje Oluştur

1. Üst menüden "Select a project" → "New Project"
2. Project name: **Sport Buddy**
3. "Create" butonuna bas
4. Proje oluşturulana kadar bekle (30 saniye)

## 3. Maps SDK'ları Aktif Et

### iOS için:
1. Sol menüden "APIs & Services" → "Library"
2. Ara: **Maps SDK for iOS**
3. "Enable" butonuna bas

### Android için (gelecekte gerekirse):
1. Ara: **Maps SDK for Android**
2. "Enable" butonuna bas

## 4. API Key Oluştur

1. Sol menüden "APIs & Services" → "Credentials"
2. Üst menüden "+ CREATE CREDENTIALS" → "API Key"
3. API Key oluşturuldu (kopyala!)
   ```
   Örnek: AIzaSyC1234567890abcdefghijklmnopqrstuvw
   ```

## 5. API Key'i Kısıtla (Güvenlik)

1. Oluşturulan API Key'e tıkla
2. "API restrictions" kısmında:
   - "Restrict key" seç
   - Sadece şunları işaretle:
     - ✅ Maps SDK for iOS
     - ✅ Maps SDK for Android (gelecek için)
3. "Save" butonuna bas

## 6. Billing Aktif Et (Zorunlu)

**ÖNEMLİ:** Google Maps ücretsiz kotayı aşmadan çalışır ama kredi kartı eklemen gerekiyor.

1. Sol menüden "Billing"
2. "Link a billing account" → Kredi kartı ekle
3. **Endişelenme:** İlk 200$ kullanım ücretsiz (aylık)
   - ~28.000 harita yüklemesi = $0
   - Çoğu startup bu kotayı aşmaz

### Ücretsiz Kota:
- **Maps SDK**: $200/ay ücretsiz
- **Places API**: İlk 1000 request ücretsiz
- Aşağı yukarı **10.000-20.000 kullanıcı** için yeterli

## 7. API Key'i Projeye Ekle

### app.json'da güncelle:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSyC1234567890abcdefghijklmnopqrstuvw"
    }
  }
}
```

### EAS Secrets'e ekle:
```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "AIzaSyC1234567890abcdefghijklmnopqrstuvw"
```

## 8. Test Et

```bash
npm start
```

Harita görünüyor mu kontrol et.

## Sorun Giderme

### "This API key is not authorized to use this service"
- API restrictions'da Maps SDK for iOS aktif mi kontrol et
- 5-10 dakika bekle (yayılması zaman alır)

### "Billing not enabled"
- Billing hesabı ekle
- Kredi kartı doğrula

### Harita boş görünüyor
- API Key doğru mu kontrol et
- Internet bağlantısı var mı?
- Console'da hata var mı?

---

**Maliyet Özeti:**
- İlk $200 ücretsiz (her ay)
- Sonrası: $7 / 1000 harita yüklemesi
- Tahmini: İlk 6-12 ay tamamen ücretsiz

**Not:** Eğer maliyetten endişeleniyorsan, Google Cloud'da "budget alert" kur:
- $50'a ulaşınca e-posta göndersin
