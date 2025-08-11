# Arketic Kurulum Talimatları

## Hızlı Başlangıç (Clone Sonrası)

Projeyi clone ettikten sonra aşağıdaki adımları takip edin:

### 1. Environment Dosyasını Oluşturun

```bash
cp .env.example .env
```

### 2. Docker Compose ile Servisleri Başlatın

```bash
# Tüm servisleri başlat ve test kullanıcılarını otomatik oluştur
docker compose up -d

# Logları takip etmek için
docker compose logs -f
```

### 3. Test Kullanıcıları Otomatik Oluşturulur

Sistem başladığında aşağıdaki test kullanıcıları otomatik olarak oluşturulur:

| Email | Password | Role |
|-------|----------|------|
| test@arketic.com | testpass123 | User |
| admin@arketic.com | testpass123 | Admin |
| playwright@arketic.com | Playwright123! | User (Test) |

### 4. Uygulamaya Erişim

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **LangChain:** http://localhost:3001

## Manuel Kullanıcı Oluşturma (Opsiyonel)

Eğer test kullanıcıları otomatik oluşturulmadıysa:

```bash
# API konteynerinde test kullanıcılarını oluştur
docker compose exec api python setup_test_users.py

# Veya harici script ile
./scripts/ensure-test-users.sh
```

## Veritabanı Migrasyonları

Migrasyonlar otomatik olarak çalıştırılır. Manuel çalıştırmak için:

```bash
# Migration durumunu kontrol et
docker compose exec api alembic current

# Tüm migrasyonları uygula
docker compose exec api alembic upgrade head

# Son migration'ı geri al
docker compose exec api alembic downgrade -1
```

## Sorun Giderme

### Kullanıcı Giriş Hatası

"Invalid email or password" hatası alıyorsanız:

1. Servislerin çalıştığından emin olun:
```bash
docker compose ps
```

2. Test kullanıcılarını kontrol edin:
```bash
docker compose exec postgres psql -U arketic -d arketic_dev -c "SELECT email, role, status FROM users;"
```

3. Kullanıcıları yeniden oluşturun:
```bash
docker compose exec api python setup_test_users.py
```

### Servisler Başlamıyorsa

```bash
# Temiz başlangıç
docker compose down -v
docker compose up -d --build
```

### Log Kontrolü

```bash
# API logları
docker compose logs api -f

# PostgreSQL logları
docker compose logs postgres -f

# Tüm servis logları
docker compose logs -f
```

## Development Ortamı

### Hot Reload

Kod değişiklikleri otomatik olarak yansıtılır:
- **API:** FastAPI hot reload aktif
- **Frontend:** Next.js hot reload aktif
- **LangChain:** Auto-reload aktif

### Test Çalıştırma

```bash
# Backend testleri
docker compose exec api pytest

# Frontend testleri
docker compose exec web npm test

# E2E testleri
./scripts/run-e2e-tests.sh
```

## Önemli Notlar

- **ASLA** servisleri Docker dışında çalıştırmayın (`npm run dev`, `uvicorn`, vb.)
- Tüm servisler Docker Compose ile yönetilmelidir
- Veritabanı bağlantıları Docker network üzerinden yapılır
- Test kullanıcıları sadece development/test ortamı içindir

## Destek

Sorun yaşarsanız:
1. GitHub Issues'a bakın
2. Docker loglarını kontrol edin
3. `.env` dosyasını kontrol edin
4. PostgreSQL ve Redis bağlantılarını doğrulayın