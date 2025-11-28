# iOS App Store Deployment - Adım Adım Rehber

**Sport Buddy** uygulamasını App Store'a yüklemek için takip edilecek adımlar.

## ✅ Tamamlanmış

- ✅ Yasal dökümanlar hazır ve yayında
- ✅ İki dil desteği (TR/EN)
- ✅ Bundle ID: `com.sportbuddy.app2`
- ✅ Apple Developer hesabı var
- ✅ app.json yapılandırması tamamlandı

## 📋 Yapılacaklar (Sırayla)

### 1️⃣ App Store Connect'te Uygulama Oluştur (10 dakika)

1. **App Store Connect'e giriş yap**
   - https://appstoreconnect.apple.com
   - Apple Developer hesabınla giriş yap

2. **Yeni uygulama oluştur**
   - "My Apps" → "+" butonu → "New App"

3. **Bilgileri doldur:**
   ```
   Platform: iOS
   Name: Sport Buddy
   Primary Language: Turkish (TR)
   Bundle ID: com.sportbuddy.app2 (seçeneklerden seç)
   SKU: sportbuddy-app-2024 (unique identifier)
   User Access: Full Access
   ```

4. **Save** butonuna bas

### 2️⃣ EAS CLI Kur ve Giriş Yap (5 dakika)

```bash
# Windows Terminal / PowerShell / CMD

# EAS CLI kur
npm install -g eas-cli

# Giriş yap
eas login

# Email: [Expo hesabın email]
# Password: [Expo şifren]
```

**Not:** Expo hesabın yoksa: https://expo.dev/signup

### 3️⃣ EAS Secrets Ekle (5 dakika)

```bash
# Proje klasörüne git
cd "C:/Users/CANAKBOYRAZ/Desktop/Cursor/sport-buddy-app-master"

# Supabase URL ekle
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://rbogaxwylrkosabunuwa.supabase.co"

# Supabase Anon Key ekle
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJib2dheHd5bHJrb3NhYnVudXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTE0MDgsImV4cCI6MjA3ODYyNzQwOH0.n8T05XFPchk-7r1A0vHzqBzh88oD1lAHah26uL86fBA"

# Secrets'i kontrol et
eas secret:list
```

### 4️⃣ eas.json'u Güncelle (2 dakika)

`eas.json` dosyasını aç ve `submit` kısmını güncelle:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "YOUR_APPLE_ID_EMAIL@example.com",
      "ascAppId": "APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "YOUR_APPLE_TEAM_ID"
    }
  }
}
```

**Nereden bulacaksın:**
- `appleId`: Apple Developer hesabının email'i
- `ascAppId`: App Store Connect > Uygulamana tıkla > URL'deki sayı (örn: 1234567890)
- `appleTeamId`: https://developer.apple.com/account → Membership → Team ID

### 5️⃣ İlk iOS Build Al (30-45 dakika)

```bash
# Build başlat
eas build --platform ios --profile production

# Sorular gelecek, cevapla:
? Generate a new Apple Distribution Certificate? → Yes
? Generate a new Apple Provisioning Profile? → Yes

# Build süreci:
# ⏳ Uploading project (1-2 dakika)
# ⏳ Building on EAS servers (25-40 dakika)
# ✅ Build complete!
```

**Build tamamlandığında:**
- Link verecek: https://expo.dev/accounts/.../builds/...
- .ipa dosyası hazır olacak

### 6️⃣ App Store Screenshots Hazırla (30 dakika)

**Gerekli Ekran Boyutları:**
- 6.7" (iPhone 14 Pro Max): 1290x2796
- veya 6.5" (iPhone 11 Pro Max): 1284x2778

**Hangi Ekranlar:**
1. **Ana Sayfa**: Etkinlik listesi, harita görünümü
2. **Etkinlik Detay**: Etkinlik bilgileri, katılımcılar
3. **Profil Sayfası**: Kullanıcı profili, istatistikler
4. **Mesajlaşma**: Chat ekranı
5. **Etkinlik Oluştur**: Form ekranı

**Nasıl Alınır:**
```bash
# iPhone'unda uygulamayı çalıştır
npm start
# → "i" bas (iOS simulator) veya gerçek cihaz

# iPhone'dan screenshot al:
# - Açılma/Kapama + Ses Artırma tuşları
# - Screenshot'ları bilgisayara at (AirDrop veya kablo)
```

**İyileştirme (Opsiyonel):**
- https://www.screely.com - Screenshot güzelleştir
- https://www.appure.io - Device mockup ekle

### 7️⃣ TestFlight'a Yükle (10 dakika)

**Otomatik Yükleme:**
```bash
eas submit --platform ios --profile production

# Build ID seç (en son build)
# ✅ Uploaded to App Store Connect
# ✅ Processing... (5-10 dakika)
# ✅ Available on TestFlight
```

**Manuel Yükleme (alternatif):**
1. Build'den .ipa dosyasını indir
2. https://appstoreconnect.apple.com
3. TestFlight sekmesi
4. .ipa dosyasını yükle

### 8️⃣ TestFlight'ta Test Et (1-2 gün)

1. **Internal Testing Grubu Oluştur**
   - App Store Connect → TestFlight
   - "Internal Testing" → "+" buton
   - Group name: "Internal Testers"
   - Kendini ekle

2. **TestFlight Uygulamasını İndir**
   - App Store'dan TestFlight'ı indir
   - Invite gelecek, kabul et
   - Sport Buddy'yi test et

3. **Test Et:**
   - ✅ Giriş yapabiliyorsun mu?
   - ✅ Etkinlik oluşturabiliyor musun?
   - ✅ Harita çalışıyor mu?
   - ✅ Push notification geliyor mu?
   - ✅ Crash olmuyor mu?

### 9️⃣ App Store Metadata Doldur (45 dakika)

**App Store Connect'te:**

1. **App Information**
   - Privacy Policy URL:
     ```
     https://canakboyraz.github.io/sportbuddy-legal-docs/privacy-policy-tr
     ```
   - Category: Health & Fitness
   - Secondary Category: Social Networking

2. **Pricing and Availability**
   - Price: Free
   - Availability: All Countries

3. **App Store Listing (Turkish)**

   **Name:**
   ```
   Sport Buddy - Spor Arkadaşı Bul
   ```

   **Subtitle (30 karakter):**
   ```
   Yakınındaki etkinlikleri keşfet
   ```

   **Promotional Text (170 karakter):**
   ```
   Yalnız spor yapmaktan bıktın mı? Sport Buddy ile yakınındaki spor etkinliklerini keşfet, yeni insanlarla tanış ve aktif yaşamın keyfini çıkar!
   ```

   **Description:**
   ```
   Sport Buddy ile spor yapmayı sosyal bir deneyime dönüştürün! Etrafınızdaki spor etkinliklerini keşfedin, yeni insanlarla tanışın ve sağlıklı bir yaşam tarzı benimseyin.

   🏃 ÖZELLİKLER:
   • Harita üzerinde yakındaki spor etkinliklerini görüntüle
   • 30+ farklı spor dalında etkinlik oluştur veya katıl
   • Gerçek zamanlı sohbet ile katılımcılarla iletişim kur
   • Etkinlik hatırlatmaları ve bildirimler
   • Kullanıcı değerlendirme sistemi
   • Profil yönetimi ve istatistikler
   • Koyu/Açık tema desteği

   ⚽ SPOR DALLARI:
   Futbol, Basketbol, Tenis, Yüzme, Koşu, Bisiklet, Yoga, Fitness ve daha fazlası!

   🔔 BİLDİRİMLER:
   • Seans başlamadan hatırlatmalar
   • Yeni katılım talepleri
   • Sohbet mesajları
   • Değerlendirme hatırlatmaları

   🌟 NEDEN SPORT BUDDY?
   • Ücretsiz ve kullanımı kolay
   • Güvenli ve doğrulanmış kullanıcılar
   • Detaylı etkinlik filtreleme
   • Sezgisel ve modern arayüz

   Bugün Sport Buddy'yi indirin ve spor yapmayı sosyal bir aktiviteye dönüştürün!
   ```

   **Keywords (100 karakter):**
   ```
   spor,fitness,etkinlik,sağlık,egzersiz,arkadaş,koşu,futbol,basketbol,tenis,aktivite
   ```

   **Support URL:**
   ```
   mailto:support@sportbuddy.app
   ```

   **Marketing URL (opsiyonel):**
   ```
   https://canakboyraz.github.io/sportbuddy-legal-docs/
   ```

4. **Screenshots Yükle**
   - 6.7" display için en az 3 screenshot
   - PNG veya JPEG format
   - RGB renk uzayı

5. **App Preview (Opsiyonel)**
   - 30 saniyelik tanıtım videosu
   - Daha sonra eklenebilir

### 🔟 App Review Bilgileri (10 dakika)

1. **App Review Information**
   ```
   First Name: Can
   Last Name: Akboyraz
   Phone: +90 507 499 8785
   Email: support@sportbuddy.app
   ```

2. **Sign-in Required: Yes**
   - Demo Account Email: demo@sportbuddy.app
   - Demo Account Password: DemoTest123!

   **ÖNEMLİ:** Bu demo hesabı oluştur ve test et!

3. **Notes (İnceleme Notları):**
   ```
   Sport Buddy, kullanıcıların yakınlarındaki spor etkinliklerini keşfetmelerini ve katılmalarını sağlayan bir sosyal ağ uygulamasıdır.

   Özellikler:
   - Konum tabanlı etkinlik arama
   - Gerçek zamanlı sohbet
   - Push bildirimler
   - Kullanıcı profilleri ve değerlendirme sistemi

   Demo hesap ile giriş yaparak tüm özellikleri test edebilirsiniz.

   Gizlilik Politikası: https://canakboyraz.github.io/sportbuddy-legal-docs/privacy-policy-tr
   ```

### 1️⃣1️⃣ İncelemeye Gönder (2 dakika)

1. **Son Kontroller:**
   - ✅ Tüm metadata dolduruldu
   - ✅ Screenshots eklendi
   - ✅ Privacy Policy URL doğru
   - ✅ Demo hesap çalışıyor
   - ✅ TestFlight'ta test edildi

2. **Submit for Review Butonuna Bas**
   - "Submit for Review"
   - Onay ver
   - ✅ Gönderildi!

3. **Bekleme Süreci:**
   - "Waiting for Review": 1-3 gün
   - "In Review": 1-2 gün
   - "Pending Developer Release" veya "Ready for Sale": ✅ Onaylandı!

## 📊 Zaman Çizelgesi

| Adım | Süre | Toplam |
|------|------|--------|
| 1. App Store Connect kurulum | 10 dk | 10 dk |
| 2. EAS CLI kurulum | 5 dk | 15 dk |
| 3. EAS Secrets | 5 dk | 20 dk |
| 4. eas.json güncelleme | 2 dk | 22 dk |
| 5. İlk build | 30-45 dk | 1 saat |
| 6. Screenshots hazırlama | 30 dk | 1.5 saat |
| 7. TestFlight yükleme | 10 dk | 1.5 saat |
| 8. TestFlight test | 1-2 gün | - |
| 9. Metadata doldurma | 45 dk | 2.5 saat |
| 10. App Review bilgileri | 10 dk | 2.5 saat |
| 11. Submit | 2 dk | 2.5 saat |
| **Apple İnceleme** | **2-7 gün** | **~1 hafta** |

## 🚨 Yaygın Sorunlar ve Çözümleri

### Build Hatası: "Provisioning profile expired"
```bash
# Yeni profil oluştur
eas build --platform ios --profile production --clear-cache
```

### Build Hatası: "Missing credentials"
```bash
# Credentials'ları sıfırla
eas credentials --platform ios
# → Remove credentials
# → Tekrar build al
```

### App Store Reject: "Missing age rating"
- App Store Connect → Age Rating → Doldur
- Şiddet, kumar, alkol soruları: Hayır
- Age Rating: 4+

### App Store Reject: "Privacy policy link broken"
- GitHub Pages aktif mi kontrol et
- Link'e tıkla, açılıyor mu?
- HTTPS ile başlıyor mu?

### TestFlight'ta "The app is taking longer to process"
- Normal, 5-10 dakika bekle
- 1 saatten fazla sürerse Apple Support ile iletişime geç

## 📞 Yardım ve Destek

**EAS Build Sorunları:**
- https://docs.expo.dev/build/introduction/

**App Store Connect:**
- https://developer.apple.com/help/app-store-connect/

**Sport Buddy Destek:**
- Email: support@sportbuddy.app
- Tel: +90 507 499 8785

## ✅ Başarı Kriterleri

Uygulamanız başarıyla yayınlandığında:
- ✅ App Store'da aranabilir durumda
- ✅ Kullanıcılar indirebiliyor
- ✅ Push notification çalışıyor
- ✅ Crash rate < %1
- ✅ Olumlu kullanıcı yorumları

---

**Hazır mısın?** Adım 1'den başla ve her adımı işaretle! 🚀
