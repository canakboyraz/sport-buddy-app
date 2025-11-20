# Sport Buddy App - Test Documentation

## 📋 İçindekiler

- [Test Altyapısı](#test-altyapısı)
- [Test Türleri](#test-türleri)
- [Nasıl Çalıştırılır](#nasıl-çalıştırılır)
- [Test Senaryoları](#test-senaryoları)
- [CI/CD Entegrasyonu](#cicd-entegrasyonu)

---

## Test Altyapısı

Bu proje aşağıdaki test araçlarını kullanmaktadır:

- **Jest**: Test framework'ü
- **React Native Testing Library**: Component testleri için
- **Custom Scripts**: Supabase query validation ve integration testleri

### Kurulum

Test bağımlılıklarını yüklemek için:

```bash
npm install
```

Test paketleri otomatik olarak `devDependencies` içinde yüklenecektir.

---

## Test Türleri

### 1. Unit Tests (Birim Testleri)

Component'lerin izole ortamda test edilmesi.

**Konum**: `src/**/__tests__/*.test.tsx`

**Örnek**:
- `SessionDetailScreen.test.tsx`: Seans detay ekranının tüm fonksiyonlarını test eder

**Ne Test Edilir**:
- Component rendering
- State management
- User interactions
- Error handling
- Data loading with explicit foreign keys

### 2. Integration Tests (Entegrasyon Testleri)

Birden fazla component'in birlikte çalışmasını test eder.

**Konum**: `__tests__/integration/*.test.ts`

**Örnek**:
- `participant-names.test.ts`: Katılımcı isim yüklemesinin tüm ekranlarda çalıştığını test eder

**Ne Test Edilir**:
- Supabase query patterns
- Data flow between components
- Foreign key relationships
- Error handling across screens

### 3. Supabase Query Validation

Tüm Supabase query'lerinin doğru foreign key referanslarını kullandığını doğrular.

**Script**: `scripts/test-supabase-queries.js`

**Ne Test Edilir**:
- Explicit foreign key usage (örn: `profiles!session_participants_user_id_fkey`)
- Query pattern validation
- Missing foreign key detection

---

## Nasıl Çalıştırılır

### Tüm Testleri Çalıştırma

Otomatik test runner ile tüm testleri çalıştırmak için:

```bash
npm run test:all
```

Bu komut sırasıyla şunları çalıştırır:
1. Supabase query validation
2. Unit tests
3. Integration tests
4. Component tests

Sonuçlar `test-results.json` dosyasına kaydedilir.

### Tek Tek Test Çalıştırma

#### Jest Unit Tests

```bash
npm test
```

Watch mode (değişiklikleri izle):

```bash
npm run test:watch
```

Coverage raporu ile:

```bash
npm run test:coverage
```

#### Supabase Query Validation

```bash
npm run test:queries
```

Detaylı çıktı için:

```bash
VERBOSE=1 npm run test:queries
```

#### Belirli Bir Dosyayı Test Etme

```bash
npm test -- SessionDetailScreen.test.tsx
```

#### Belirli Bir Test Çalıştırma

```bash
npm test -- -t "should load session with participant profiles"
```

### Otomatik Test Runner

```bash
node scripts/run-all-tests.js
```

Çıktı örneği:
```
🚀 Starting Automated Test Suite
═══════════════════════════════════════════════════════════
  1️⃣  Supabase Query Validation
═══════════════════════════════════════════════════════════

▶ Running: Validate Supabase queries use explicit foreign keys...
✅ Passed (234ms)

═══════════════════════════════════════════════════════════
  2️⃣  Unit Tests
═══════════════════════════════════════════════════════════

▶ Running: Run Jest unit tests...
✅ Passed (3421ms)

📊 Test Results Summary

Total Tests:     4
Passed:          4
Failed:          0
Total Duration:  4156ms

🎉 All tests passed!
```

---

## Test Senaryoları

### Katılımcı İsim Yüklemesi

Bu testler, katılma isteklerinde ve diğer yerlerde kullanıcı isimlerinin doğru yüklendiğini doğrular.

#### ✅ Test 1: Tüm katılımcı isimleri yükleniyor

```typescript
// SessionDetailScreen'da tüm katılımcıların isimleri görünmeli
await waitFor(() => {
  expect(getByText('John Doe')).toBeTruthy();
  expect(getByText('Jane Smith')).toBeTruthy();
});
```

#### ✅ Test 2: Eksik profil uyarısı

```typescript
// Profil yüklenemediğinde uyarı gösterilmeli
expect(getByText('Profil yüklenemedi')).toBeTruthy();
expect(getByText('Kullanıcı')).toBeTruthy();
```

#### ✅ Test 3: Explicit foreign key kullanımı

```typescript
// Query'de explicit foreign key olmalı
expect(mockSupabaseChain.select).toHaveBeenCalledWith(
  expect.stringContaining('profiles!session_participants_user_id_fkey')
);
```

#### ✅ Test 4: Hata loglama

```typescript
// Hata durumunda console.error çağrılmalı
expect(console.error).toHaveBeenCalledWith(
  '[SessionDetail] Error fetching participant data:',
  expect.any(Object)
);
```

### Sohbet Ekranı

#### ✅ Test 5: Mesaj gönderen isimleri yükleniyor

```typescript
// ChatScreen'da mesaj gönderen isimleri görünmeli
expect(data[0].user.full_name).toBe('Alice Johnson');
expect(data[1].user.full_name).toBe('Bob Smith');
```

### Onaylama Akışı

#### ✅ Test 6: Katılımcı onaylamadan önce isim yükleniyor

```typescript
// handleApprove çağrıldığında participant bilgisi doğru yüklenmeli
const { data } = await supabase
  .from('session_participants')
  .select('user_id, user:profiles!session_participants_user_id_fkey(full_name)')
  .eq('id', 1)
  .single();

expect(data.user.full_name).toBe('Alice Johnson');
```

---

## Test Coverage

Coverage raporunu görmek için:

```bash
npm run test:coverage
```

Hedef coverage:
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

Coverage raporu `coverage/` klasöründe oluşturulur.

HTML raporu görmek için:

```bash
open coverage/lcov-report/index.html
```

---

## CI/CD Entegrasyonu

### GitHub Actions

`.github/workflows/test.yml` dosyası oluşturarak otomatik test çalıştırabilirsiniz:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run all tests
        run: npm run test:all

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Test'leri commit öncesi çalıştırmak için `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test:queries
npm test -- --bail --findRelatedTests
```

---

## Hata Ayıklama

### Test Başarısız Olduğunda

1. **Verbose mode ile çalıştırın**:
   ```bash
   npm test -- --verbose
   ```

2. **Tek test çalıştırın**:
   ```bash
   npm test -- -t "test ismi"
   ```

3. **Debug mode**:
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```

4. **Log'ları kontrol edin**:
   ```bash
   VERBOSE=1 npm run test:queries
   ```

### Sık Karşılaşılan Sorunlar

#### 1. "Cannot find module" Hatası

**Çözüm**: Dependencies'i yeniden yükleyin
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. Mock Hataları

**Çözüm**: Mock'ları clear edin
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 3. Async Test Timeout

**Çözüm**: Timeout'u artırın
```typescript
jest.setTimeout(10000); // 10 seconds
```

---

## Test Best Practices

### ✅ Yapılması Gerekenler

1. **Her yeni özellik için test yazın**
2. **Mock'ları kullanın** (Supabase, navigation, vb.)
3. **Explicit foreign key'leri test edin**
4. **Error handling'i test edin**
5. **Edge case'leri düşünün** (null, undefined, empty array)

### ❌ Yapılmaması Gerekenler

1. **Gerçek API'lara request atmayın**
2. **Test'ler birbirine bağımlı olmasın**
3. **Global state'i paylaşmayın**
4. **Timeout'ları çok uzun tutmayın**

---

## Test Ekleme Rehberi

### Yeni Component Test'i Ekleme

1. **Test dosyası oluşturun**:
   ```
   src/screens/YourScreen/__tests__/YourScreen.test.tsx
   ```

2. **Template kullanın**:
   ```typescript
   import React from 'react';
   import { render, waitFor } from '@testing-library/react-native';
   import YourScreen from '../YourScreen';

   describe('YourScreen', () => {
     it('should render correctly', () => {
       const { getByText } = render(<YourScreen />);
       expect(getByText('Expected Text')).toBeTruthy();
     });
   });
   ```

3. **Test'i çalıştırın**:
   ```bash
   npm test -- YourScreen.test.tsx
   ```

### Yeni Query Validation Pattern Ekleme

`scripts/test-supabase-queries.js` dosyasında `FOREIGN_KEY_PATTERNS` objesine ekleyin:

```javascript
const FOREIGN_KEY_PATTERNS = {
  'your_table': {
    user: 'your_table_user_id_fkey',
  },
};
```

---

## Yardım

Test'lerle ilgili sorunlar için:

1. Bu dokümantasyonu okuyun
2. Test çıktılarını inceleyin
3. `test-results.json` dosyasını kontrol edin
4. GitHub Issues'a konu açın

---

**Son Güncelleme**: 2025-11-20

**Test Coverage**: 🎯 Hedef %80+
