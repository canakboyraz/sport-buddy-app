# Yasal Dökümanlar / Legal Documents

Bu klasör, Sport Buddy uygulamasının yasal dökümanlarını içerir. AppStore ve Google Play Store yayınlamak için bu dökümanların web üzerinde erişilebilir olması gerekir.

## 📄 Döküman Listesi

### Türkçe Dökümanlar
- `privacy-policy-tr.md` - Gizlilik Politikası
- `terms-of-service-tr.md` - Kullanım Şartları
- `kvkk-aydinlatma-metni.md` - KVKK Aydınlatma Metni
- `contact-support.md` - İletişim ve Destek

### English Documents
- `privacy-policy-en.md` - Privacy Policy
- `terms-of-service-en.md` - Terms of Service

## 🌐 Web Hosting Seçenekleri

Bu dökümanları web'de yayınlamak için aşağıdaki yöntemlerden birini kullanabilirsiniz:

### Seçenek 1: GitHub Pages (Ücretsiz ve Kolay)

1. **Repository Ayarları**:
   ```bash
   # GitHub'da yeni bir public repository oluşturun
   # Örnek: sportbuddy-legal-docs
   ```

2. **Dökümanları Yükleyin**:
   ```bash
   git init
   git add docs/legal/*
   git commit -m "Add legal documents"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sportbuddy-legal-docs.git
   git push -u origin main
   ```

3. **GitHub Pages'i Etkinleştirin**:
   - Repository Settings > Pages
   - Source: Deploy from a branch
   - Branch: main, folder: /docs/legal veya /root
   - Save

4. **URL'ler**:
   ```
   https://YOUR_USERNAME.github.io/sportbuddy-legal-docs/privacy-policy-tr
   https://YOUR_USERNAME.github.io/sportbuddy-legal-docs/terms-of-service-tr
   https://YOUR_USERNAME.github.io/sportbuddy-legal-docs/kvkk-aydinlatma-metni
   ```

5. **Markdown'u HTML'e Çevirme**:
   GitHub Pages otomatik olarak Markdown dosyalarını HTML'e çevirir. Alternatif olarak:
   ```bash
   # Pandoc kullanarak manuel çevirme
   pandoc privacy-policy-tr.md -o privacy-policy-tr.html
   pandoc terms-of-service-tr.md -o terms-of-service-tr.html
   pandoc kvkk-aydinlatma-metni.md -o kvkk-aydinlatma-metni.html
   ```

### Seçenek 2: Vercel (Ücretsiz ve Profesyonel)

1. **Vercel Hesabı Oluşturun**: https://vercel.com

2. **Dökümanları Deploy Edin**:
   ```bash
   npm install -g vercel
   vercel login
   cd docs/legal
   vercel
   ```

3. **Özel Domain (Opsiyonel)**:
   - legal.sportbuddy.app gibi bir subdomain ekleyebilirsiniz

### Seçenek 3: Netlify (Ücretsiz)

1. **Netlify Hesabı**: https://netlify.com

2. **Deploy**:
   - Web arayüzünden docs/legal klasörünü sürükleyip bırakın
   - Veya Netlify CLI kullanın:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy
   ```

### Seçenek 4: Kendi Web Siteniz

Eğer www.sportbuddy.app gibi bir web siteniz varsa:

1. **Web Sunucusuna Yükleyin**:
   ```bash
   # FTP/SFTP ile yükleme
   /public_html/legal/privacy-policy-tr.html
   /public_html/legal/terms-of-service-tr.html
   /public_html/legal/kvkk-aydinlatma-metni.html
   ```

2. **URL Yapısı**:
   ```
   https://www.sportbuddy.app/legal/privacy-tr
   https://www.sportbuddy.app/legal/terms-tr
   https://www.sportbuddy.app/legal/kvkk
   ```

## 🔧 Uygulama Ayarları

Dökümanları host ettikten sonra, SettingsScreen.tsx dosyasındaki URL'leri güncelleyin:

```typescript
// src/screens/Settings/SettingsScreen.tsx

// Satır 79-82: Terms of Service
const termsUrl = currentLanguage === 'tr'
  ? 'https://YOUR_DOMAIN/legal/terms-tr'  // BURAYA GERCEK URL
  : 'https://YOUR_DOMAIN/legal/terms-en'; // BURAYA GERCEK URL

// Satır 92-95: Privacy Policy
const privacyUrl = currentLanguage === 'tr'
  ? 'https://YOUR_DOMAIN/legal/privacy-tr'  // BURAYA GERCEK URL
  : 'https://YOUR_DOMAIN/legal/privacy-en'; // BURAYA GERCEK URL

// Satır 105: KVKK
Linking.openURL('https://YOUR_DOMAIN/legal/kvkk'); // BURAYA GERCEK URL
```

## 📱 App Store ve Google Play Ayarları

### App Store Connect

1. **Giriş yapın**: https://appstoreconnect.apple.com
2. **Uygulamanızı seçin** > App Information
3. **Privacy Policy URL**: Gizlilik politikası URL'inizi girin
   ```
   https://YOUR_DOMAIN/legal/privacy-tr
   ```

### Google Play Console

1. **Giriş yapın**: https://play.google.com/console
2. **Uygulamanızı seçin** > Store Presence > Store Listing
3. **Privacy Policy**: URL'inizi girin
   ```
   https://YOUR_DOMAIN/legal/privacy-tr
   ```
4. **App content** bölümünde Privacy Policy tekrar gerekir

## ✅ Kontrol Listesi

Yayınlamadan önce kontrol edin:

- [ ] Tüm dökümanlar web'de erişilebilir
- [ ] URL'ler HTTPS ile başlıyor
- [ ] Mobil cihazlarda düzgün görüntüleniyor
- [ ] Her iki dil (TR/EN) için ayrı URL'ler var
- [ ] SettingsScreen.tsx'te URL'ler güncellendi
- [ ] App Store Connect'te Privacy Policy URL'i eklendi
- [ ] Google Play Console'da Privacy Policy URL'i eklendi
- [ ] Dökümanlar okunabilir ve anlaşılır
- [ ] İletişim bilgileri (e-posta, adres) güncellendi
- [ ] Son güncelleme tarihleri doğru

## 🎨 HTML Template (Opsiyonel)

Dökümanları daha profesyonel göstermek için basit bir HTML template:

```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sport Buddy - Gizlilik Politikası</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #6200ee; }
        h2 { color: #6200ee; margin-top: 2em; }
        a { color: #6200ee; }
    </style>
</head>
<body>
    <!-- Markdown içeriğinizi buraya HTML olarak ekleyin -->
</body>
</html>
```

## 📝 Güncelleme Süreci

Dökümanları güncellerken:

1. **Markdown dosyasını güncelleyin**
2. **Son Güncelleme tarihini değiştirin**
3. **HTML'e çevirin** (gerekirse)
4. **Web sunucusuna yükleyin**
5. **App Store'da önemli değişiklikler için yeni versiyon gönderin**

## ⚖️ Önemli Notlar

### Zorunlu Bilgiler
Dökümanları yayınlamadan önce **mutlaka** aşağıdaki bilgileri güncelleyin:

- `[Şirket Adresiniz]` → Gerçek şirket adresiniz
- `[İletişim Numaranız]` → Gerçek telefon numaranız
- `[Şehir]` → Mahkeme şehri (uyuşmazlıklar için)
- E-posta adresleri (privacy@, support@, legal@)

### Yasal Danışmanlık
Bu dökümanlar genel bir şablon olarak hazırlanmıştır. Yayınlamadan önce:
- Bir avukata gösterin
- KVKK uzmanına danışın (Türkiye için)
- Hukuk danışmanınızla gözden geçirin

### KVKK Gereklilikleri (Türkiye)
Türkiye'de faaliyet gösteriyorsanız:
- KVKK aydınlatma metnini Türkçe sağlayın
- Veri Sorumlusu bilgilerini doğru verin
- VERBIS kaydı yapın (gerekirse)

## 🔗 Yararlı Linkler

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- [KVKK Resmi Web Sitesi](https://www.kvkk.gov.tr)
- [GDPR Official Site](https://gdpr.eu)

## 📞 Destek

Sorularınız için:
- E-posta: legal@sportbuddy.app
- GitHub Issues: [Repository Link]

---

**Son Güncelleme**: 28 Kasım 2024

Bu dökümanları web'de yayınlamak, AppStore ve Google Play Store gerekliliklerini karşılamak için zorunludur.
