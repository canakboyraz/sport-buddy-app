# Sport Buddy - App Store Deployment Guide

## 📋 Ön Gereksinimler Kontrol Listesi

### Genel Gereksinimler
- [ ] Expo hesabı oluşturuldu (https://expo.dev)
- [ ] EAS CLI kuruldu: `npm install -g eas-cli`
- [ ] Expo'ya giriş yapıldı: `eas login`

### iOS (App Store) İçin
- [ ] Apple Developer hesabı (99$/yıl) - https://developer.apple.com/programs/
- [ ] App Store Connect hesabı oluşturuldu
- [ ] Yeni uygulama App Store Connect'te oluşturuldu
- [ ] Bundle ID: `com.sportbuddy.app` (veya tercih ettiğiniz)

### Android (Google Play) İçin
- [ ] Google Play Console hesabı (25$ tek seferlik) - https://play.google.com/console
- [ ] Yeni uygulama Google Play Console'da oluşturuldu
- [ ] Package name: `com.sportbuddy.app`

## 🎨 Gerekli Görsel Materyaller

### 1. Uygulama İkonları
Aşağıdaki dosyaları `assets/` klasörüne ekleyin:

```
assets/
├── icon.png (1024x1024) - Ana ikon
├── adaptive-icon.png (1024x1024) - Android adaptive ikon
├── splash.png (1284x2778) - Splash screen
└── notification-icon.png (96x96) - Bildirim ikonu
```

### 2. App Store Ekran Görüntüleri (iOS)
Her ekran boyutu için en az 3-8 ekran görüntüsü:
- 6.7" iPhone (1290x2796)
- 6.5" iPhone (1284x2778)
- 5.5" iPhone (1242x2208)

### 3. Google Play Ekran Görüntüleri (Android)
- Telefon: 1080x1920 veya daha büyük (en az 2 adet)
- 7" Tablet: 1200x1920
- 10" Tablet: 1600x2560

### 4. Feature Graphic (Android)
- 1024x500 - Google Play'de üstte görünen banner

## 🔧 Yapılandırma Adımları

### 1. app.json Güncellemeleri
✅ Tamamlandı - Güncel yapılandırma:
- iOS Bundle ID: `com.sportbuddy.app`
- Android Package: `com.sportbuddy.app`
- Versiyon: 1.0.0
- İzinler: Konum, Kamera, Fotoğraf erişimi

### 2. eas.json Yapılandırması
✅ Oluşturuldu - Production build ayarları hazır

### 3. Çevre Değişkenleri
`.env` dosyasındaki hassas bilgileri EAS Secrets'e ekleyin:

```bash
# Supabase bilgilerini EAS'a ekle
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_VALUE
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_VALUE
```

## 📱 Build Alma Adımları

### iOS Build

```bash
# 1. EAS projeyi yapılandır
eas build:configure

# 2. iOS Production build
eas build --platform ios --profile production

# Build tamamlandığında .ipa dosyası indirilir
```

### Android Build

```bash
# Android Production build (AAB dosyası)
eas build --platform android --profile production

# Build tamamlandığında .aab dosyası indirilir
```

### Her İki Platform

```bash
# Hem iOS hem Android için build
eas build --platform all --profile production
```

## 📤 Store'a Yükleme

### iOS - App Store

#### Manuel Yükleme:
1. Build tamamlandığında .ipa dosyasını indirin
2. https://appstoreconnect.apple.com adresine gidin
3. "My Apps" > Uygulamanız > "TestFlight" sekmesi
4. .ipa dosyasını yükleyin
5. TestFlight'ta test edin
6. "App Store" sekmesinden yayına hazırlayın

#### EAS Submit ile Otomatik:
```bash
# eas.json dosyasında submit bilgilerini doldurun
eas submit --platform ios --profile production
```

### Android - Google Play

#### Manuel Yükleme:
1. Build tamamlandığında .aab dosyasını indirin
2. https://play.google.com/console adresine gidin
3. Uygulamanız > "Production" > "Create new release"
4. .aab dosyasını yükleyin
5. Release notes ekleyin
6. İncelemeye gönderin

#### EAS Submit ile Otomatik:
```bash
# Google Service Account key'i oluşturun ve google-service-account.json olarak kaydedin
eas submit --platform android --profile production
```

## 📝 Store Listeleme Bilgileri

### Uygulama Açıklaması (Türkçe)

**Başlık:** Sport Buddy - Spor Arkadaşı Bul

**Kısa Açıklama:**
Yakınındaki spor etkinliklerini keşfet, spor arkadaşı bul ve aktif yaşam tarzını benimse!

**Uzun Açıklama:**
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

### Keywords (Anahtar Kelimeler)
spor, fitness, spor arkadaşı, etkinlik, sağlık, egzersiz, koşu, futbol, basketbol, tenis

### Kategoriler
- Ana Kategori: Health & Fitness
- İkincil: Social Networking

## ⚖️ Yasal Gereksinimler

### 1. Gizlilik Politikası
⚠️ **ZORUNLU** - Hazırlanması ve URL'inin eklenmesi gerekiyor

Hazırlanması gerekenler:
- Ne tür veriler toplandığı
- Verilerin nasıl kullanıldığı
- Üçüncü taraf servislerin kullanımı (Supabase, Google Maps)
- Kullanıcı hakları
- İletişim bilgileri

Gizlilik politikası URL'ini şu alanlara ekleyin:
- App Store Connect > Privacy Policy URL
- Google Play Console > Privacy Policy

### 2. Kullanım Şartları
Önerilen - Uygulamanın kullanım kurallarını belirleyin

### 3. Destek URL'i
İletişim sayfası veya destek e-postası

## 🔍 Inceleme Öncesi Kontrol Listesi

### Teknik
- [ ] Tüm özellikler çalışıyor
- [ ] Crash yok
- [ ] Performans sorunları giderildi
- [ ] API key'leri production için güncellendi
- [ ] Push notification'lar test edildi
- [ ] Offline durumlar ele alındı

### İçerik
- [ ] Uygulama açıklaması hazır
- [ ] Ekran görüntüleri hazır
- [ ] Uygulama ikonu hazır
- [ ] Preview video (opsiyonel ama önerilir)
- [ ] Gizlilik politikası URL'i hazır
- [ ] Destek URL'i hazır

### Yasal
- [ ] Gizlilik politikası onaylandı
- [ ] Kullanım şartları hazır
- [ ] Telif hakkı bilgileri doğru
- [ ] Yaş kısıtlaması belirlendi (4+ önerilir)

## 📊 Test Süreci

### TestFlight (iOS)
1. Build'i TestFlight'a yükleyin
2. İç test grubu oluşturun
3. Beta test kullanıcıları ekleyin
4. Geri bildirim toplayın
5. Hataları düzeltin
6. App Store'a gönderin

### Internal Testing (Android)
1. Build'i Internal Testing track'e yükleyin
2. Test kullanıcıları ekleyin
3. Test edin
4. Production'a yükseltin

## 🚀 Yayın Süreci

### iOS Ortalama İnceleme Süresi
- 24-48 saat
- Red edilirse düzeltmeler sonrası tekrar inceleme: 24 saat

### Android Ortalama İnceleme Süresi
- İlk yükleme: 2-7 gün
- Güncellemeler: 1-3 gün

## 💡 Önemli Notlar

1. **Google Maps API Key**: Production için yeni key oluşturun ve kota limitlerini ayarlayın
2. **Supabase**: Row Level Security politikalarını kontrol edin
3. **Bildirimler**: Expo Go'da çalışmaz, production build gerekir
4. **Sentry**: Error tracking için Sentry DSN'i güncelleyin
5. **Analytics**: Google Analytics veya Firebase Analytics ekleyin (opsiyonel)

## 📞 Yardım ve Destek

- Expo Docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policy: https://play.google.com/about/developer-content-policy/

## 🎯 Sonraki Adımlar

1. ✅ app.json ve eas.json yapılandırıldı
2. ⏳ Görsel materyaller hazırlanacak (icon, splash, screenshots)
3. ⏳ Gizlilik politikası oluşturulacak
4. ⏳ Apple Developer ve Google Play hesapları oluşturulacak
5. ⏳ İlk build alınacak
6. ⏳ TestFlight/Internal Testing ile test edilecek
7. ⏳ Store'lara yüklenecek

---

**Not:** Bu doküman, Sport Buddy uygulamasını App Store ve Google Play Store'a yüklemek için gereken tüm adımları içermektedir.
