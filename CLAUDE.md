# Arketic Projesi - Önemli Bilgiler

## Backend Dokümantasyonu

Backend dokümantasyonu aşağıdaki dizinlerde bulunmaktadır:

- **Ana Dokümantasyon Dizini:** `/home/ali/arketic_ai/apps/api/docs`
  - `api/` - API endpoint dokümantasyonları
    - ASSISTANTS.md - Asistan API'leri
    - AUTH.md - Kimlik doğrulama API'leri  
    - CHAT.md - Sohbet API'leri
    - KNOWLEDGE.md - Bilgi yönetimi API'leri
    - LANGCHAIN.md - LangChain entegrasyonu
    - OPENAI_SETTINGS.md - OpenAI ayarları
    - PEOPLE.md - Kişi yönetimi API'leri
  - `database/` - Veritabanı şema dokümantasyonu
  - Test dosyaları ve raporları

## ⭐ Comprehensive Testing Infrastructure (AR-82)

### 📋 Test Architecture Overview

Arketic platformu için kapsamlı test altyapısı şu bileşenlerden oluşur:

#### 🎭 Frontend E2E Tests (Playwright MCP)
- **Lokasyon:** `/home/ali/arketic_ai/apps/web/tests/playwright/`
- **Test Suites:**
  - `auth/auth.spec.ts` - Kimlik doğrulama ve oturum yönetimi
  - `knowledge/knowledge-upload.spec.ts` - Bilgi yönetimi ve dosya yükleme
  - `chat/chat.spec.ts` - Chat arayüzü ve AI entegrasyonu
  - `organization/organization.spec.ts` - Organizasyon yönetimi
  - `settings/settings.spec.ts` - Ayarlar ve kullanıcı tercihleri

#### 🔧 Backend API Tests
- **Mevcut Testler:** `/home/ali/arketic_ai/apps/api/docs/`
  - `auth_test.py` - Kimlik doğrulama API testleri
  - `chat_test.py` - Sohbet API testleri
  - `assistant_test.py` - Asistan API testleri
  - `knowledge_test.py` - Bilgi yönetimi API testleri
  - `people_test.py` - Kişi yönetimi API testleri
  - `langchain_test.py` - LangChain servis testleri

- **Yeni Endpoint Testleri (AR-82):**
  - `compliance_test.py` - Uyumluluk yönetimi API testleri
  - `health_test.py` - Sağlık kontrolü endpoint testleri
  - `forms_test.py` - Form yönetimi API testleri

### 🚀 Test Execution Methods

#### 1. Yerel Geliştirme (Tüm Testler)
```bash
# Tüm test suite'ini çalıştır
./scripts/run-e2e-tests.sh

# Sadece frontend testleri
./scripts/run-e2e-tests.sh frontend-only

# Sadece backend testleri  
./scripts/run-e2e-tests.sh backend-only

# Headed modda çalıştır (Playwright'ı görsel olarak izle)
./scripts/run-e2e-tests.sh headed
```

#### 2. Frontend Playwright Tests (Ayrı)
```bash
cd apps/web/tests/playwright

# Tüm frontend testleri çalıştır
./run-all-tests.sh

# Belirli test suite çalıştır
./run-all-tests.sh auth
./run-all-tests.sh knowledge
./run-all-tests.sh chat
./run-all-tests.sh organization
./run-all-tests.sh settings

# Kullanılabilir test suite'lerini listele
./run-all-tests.sh list
```

#### 3. Backend API Tests (Ayrı)
```bash
# Docker container içinde backend testleri çalıştır
docker exec -it arketic_ai-api-1 bash

# Mevcut API testleri
cd /app/docs
python auth_test.py
python chat_test.py
python assistant_test.py
python knowledge_test.py
python people_test.py
python langchain_test.py

# Yeni endpoint testleri (AR-82)
python compliance_test.py
python health_test.py
python forms_test.py

# Entegrasyon testleri
python integrate_tests.py
python multi_file_upload_test.py
```

### 📊 Test Reports ve Monitoring

#### Test Raporları
- **Frontend Reports:** `/apps/web/tests/playwright/reports/`
- **Backend Reports:** `/apps/api/docs/*_test_report.json`
- **Consolidated Report:** Test runner tarafından otomatik oluşturulan HTML raporu

#### Mevcut Test Başarı Oranları
- **auth_test_report.json** - ✅ 4/4 test başarılı (%100)
- **chat_test_report.json** - ✅ 22/22 test başarılı (%100)  
- **assistant_test_report.json** - ✅ Asistan testleri
- **knowledge_test_report.json** - ✅ Bilgi yönetimi testleri
- **people_test_report.json** - ✅ Kişi yönetimi testleri
- **langchain_test_report.json** - ✅ LangChain servis testleri

### 🔄 CI/CD Integration

#### GitHub Actions Workflow
- **Dosya:** `.github/workflows/e2e-tests.yml`
- **Trigger:** Push to main/develop, PR'lar, günlük schedule
- **Kapsamı:** 
  - Backend API testleri (PostgreSQL + Redis ile)
  - Frontend Playwright testleri (Tam Docker ortamı)
  - Entegrasyon testleri
  - Performance testleri
  - Konsolide rapor oluşturma

#### Test Strategy
1. **Standalone Testing:** Yeni endpointler için önce izole testler
2. **Progressive Integration:** Başarılı testler ana suite'e entegre
3. **Environment Isolation:** Her test ortamı için ayrı veritabanı
4. **Parallel Execution:** Testler paralel çalıştırılabilir
5. **Comprehensive Reporting:** JSON + HTML raporları

### 🎯 Test Coverage

#### Frontend Coverage (Playwright MCP)
- ✅ Authentication flows (login, logout, session management)
- ✅ Knowledge management (upload, search, document processing)  
- ✅ Chat interface (messaging, real-time updates, WebSocket)
- ✅ Organization management (people, compliance, permissions)
- ✅ Settings and preferences (profile, AI settings, privacy)

#### Backend API Coverage
- ✅ Existing endpoints (Auth, Chat, Assistants, Knowledge, People, LangChain)
- ✅ New endpoints (Compliance, Health, Forms) - AR-82
- ✅ Error handling ve validation
- ✅ Authentication ve authorization
- ✅ Performance ve load testing
- ✅ Database integration (pgvector)

### 🛠️ Test Development Guidelines

#### Frontend Test Development
```typescript
// apps/web/tests/playwright/example/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await loginUser(page);
    await page.click('text=Feature');
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
  });
});
```

#### Backend Test Development
```python
# apps/api/docs/new_feature_test.py
import asyncio
from datetime import datetime
from test_base import APITester

class NewFeatureAPITester(APITester):
    async def test_new_endpoint(self):
        # Test implementation
        
if __name__ == "__main__":
    asyncio.run(main())
```

### 🔍 Troubleshooting Tests

#### Frontend Test Issues
```bash
# Debug modu
HEADLESS=false ./run-all-tests.sh

# Specific browser
npx playwright test --headed --browser=chromium

# Screenshot on failure
npx playwright test --screenshot=only-on-failure
```

#### Backend Test Issues  
```bash
# Container logs
docker logs arketic_ai-api-1 -f

# Service health
curl http://localhost:8000/health
curl http://localhost:3001/health

# Database connection
docker exec arketic_ai-postgres-1 psql -U arketic -d arketic_dev -c "SELECT 1;"
```

## Docker Kullanımı - ÖNEMLİ

Bu sistem **Docker konteynerlerinde** çalışmaktadır. Aşağıdaki servislerin tümü Docker Compose ile yönetilmektedir:

### Çalışan Servisler:
- **PostgreSQL** (pgvector) - Port 5432
- **Redis** - Port 6379  
- **API** (FastAPI) - Port 8000
- **LangChain** - Port 3001
- **Web** (Next.js) - Port 3000

### PostgreSQL Bağlantı Bilgileri (.env dosyasından):
- **Host:** postgres (Docker network içinde) / localhost:5432 (host makineden)
- **Database:** arketic_dev
- **Username:** arketic
- **Password:** arketic_dev_password
- **Port:** 5432
- **Connection String:** `postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev`

### ⚠️ ÖNEMLİ UYARILAR:

**ASLA** aşağıdaki komutları doğrudan çalıştırmayın:
- ❌ `npm run dev`
- ❌ `uvicorn main:app`
- ❌ `python3 main.py`
- ❌ `npm start`
- ❌ `yarn dev`

### ✅ Doğru Kullanım:

Servisleri yönetmek için Docker Compose komutlarını kullanın:
- `docker compose up` - Tüm servisleri başlat
- `docker compose down` - Tüm servisleri durdur
- `docker compose logs [servis-adı]` - Logları görüntüle
- `docker compose restart [servis-adı]` - Servisi yeniden başlat
- `docker exec -it [konteyner-adı] bash` - Konteynere bağlan

### Geliştirme Ortamı:
- Kod değişiklikleri otomatik olarak konteynerlere yansıtılır (volume mount ile)
- Hot-reload aktiftir, dosya değişikliklerinde servisler otomatik yenilenir
- Veritabanı migrasyonları Alembic ile yönetilir

## Proje Yapısı

```
/home/ali/arketic_ai/
├── apps/
│   ├── api/          # FastAPI backend
│   ├── langchain/    # LangChain servisi
│   └── web/          # Next.js frontend
├── docker-compose.yml
├── scripts/          # Yardımcı scriptler
└── monitoring/       # İzleme yapılandırmaları
```

## Test Altyapısı ve Dokümantasyonu

### 📊 Test Raporları ve Sonuçları

Backend API testlerinin detaylı raporları `/home/ali/arketic_ai/apps/api/docs` dizininde JSON formatında saklanmaktadır:

#### Test Raporları:
- **auth_test_report.json** - Kimlik doğrulama testleri
  - ✅ 4/4 test başarılı (%100 başarı oranı)
  - Ortalama yanıt süresi: 52.37ms
  - Test edilen endpointler: login, refresh, me, validate
  
- **chat_test_report.json** - Sohbet sistemi testleri  
  - ✅ 22/22 test başarılı (%100 başarı oranı)
  - Ortalama yanıt süresi: 92.96ms
  - WebSocket testleri dahil
  - LangChain entegrasyon testleri
  - Circuit breaker ve fallback mekanizmaları test edildi
  
- **assistant_test_report.json** - AI asistan testleri
- **knowledge_test_report.json** - Bilgi yönetimi testleri
- **people_test_report.json** - Kişi yönetimi testleri
- **langchain_test_report.json** - LangChain servis testleri

### 🧪 Test Komutları

#### Backend (API) Testleri:
```bash
# Docker konteyner içinde testleri çalıştır
docker exec -it arketic_ai-api-1 bash

# Tüm API testlerini çalıştır
cd /app
python3 -m pytest apps/api/tests/ -v

# Belirli bir test dosyasını çalıştır
python3 apps/api/docs/auth_test.py
python3 apps/api/docs/chat_test.py
python3 apps/api/docs/assistant_test.py
python3 apps/api/docs/knowledge_test.py
python3 apps/api/docs/people_test.py
python3 apps/api/docs/langchain_test.py

# Performance/Benchmark testleri
python3 apps/api/tests/test_pgvector_benchmark.py
python3 apps/api/test_rag_integration.py
```

#### Frontend (Web) Testleri:
```bash
# Docker konteyner içinde testleri çalıştır
docker exec -it arketic_ai-web-1 bash

# Jest testlerini çalıştır
npm test
npm run test:watch  # Watch modunda
npm run test:coverage  # Coverage raporu ile

# Belirli test dosyaları:
# - components/ui/__tests__/button.test.tsx
# - components/chat/__tests__/ChatWindow.test.tsx
# - lib/__tests__/utils.test.ts
# - lib/__tests__/state-manager.test.ts
# - lib/stores/__tests__/chat-store.test.ts
```

#### LangChain Servisi Testleri:
```bash
# Docker konteyner içinde
docker exec -it arketic-langchain bash

# Servis sağlık kontrolü
curl http://localhost:3001/health

# Test endpoint'i
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "chatId": "test-123"}'
```

### 🔍 Test Kapsamı

#### Backend Test Kapsamı:
- **Authentication**: Login, token refresh, user info, validation
- **Chat System**: CRUD operations, WebSocket communication, typing indicators
- **AI Integration**: OpenAI, LangChain, streaming responses
- **Knowledge Base**: Document management, vector search (pgvector)
- **People Management**: CRUD operations, permissions
- **Circuit Breaker**: Service resilience, fallback mechanisms
- **Performance**: Database benchmarks, RAG integration tests

#### Frontend Test Kapsamı:
- **Components**: UI components (buttons, modals, forms)
- **State Management**: Zustand stores, state synchronization
- **API Integration**: API client, error handling
- **Chat Interface**: Message rendering, real-time updates
- **Organization Management**: People, compliance, permissions

### 📋 Test Ortamı Yapılandırması

#### Environment Variables (.env.test):
```bash
# Test veritabanı
DATABASE_URL=postgresql://arketic:arketic_dev_password@postgres:5432/arketic_test

# Test Redis
REDIS_URL=redis://redis:6379/1

# Test API Keys
OPENAI_API_KEY=test-key-for-testing
LANGCHAIN_API_KEY=test-langchain-key

# Test ortamı
NODE_ENV=test
ENVIRONMENT=test
```

### 🚀 CI/CD Test Pipeline

GitHub Actions veya benzeri CI/CD sistemleri için:

```yaml
# .github/workflows/test.yml örneği
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Docker Compose Tests
        run: |
          docker compose -f docker-compose.test.yml up --abort-on-container-exit
          docker compose -f docker-compose.test.yml down
```

### 🐛 Debugging ve Troubleshooting

#### Test Hatalarını Debug Etme:
```bash
# Verbose output ile test çalıştır
pytest -vvv apps/api/tests/

# Belirli bir test için debug
pytest -s apps/api/docs/auth_test.py::test_login

# Docker loglarını kontrol et
docker compose logs api -f
docker compose logs langchain -f
docker compose logs web -f
```

#### Yaygın Sorunlar ve Çözümleri:

1. **Database Connection Errors**:
   ```bash
   # Postgres container'ı kontrol et
   docker compose ps postgres
   docker compose restart postgres
   ```

2. **Redis Connection Issues**:
   ```bash
   # Redis durumunu kontrol et
   docker exec -it arketic_ai-redis-1 redis-cli ping
   ```

3. **Port Conflicts**:
   ```bash
   # Kullanılan portları kontrol et
   netstat -tulpn | grep -E '3000|3001|8000|5432|6379'
   ```

4. **Test Database Reset**:
   ```bash
   # Test veritabanını sıfırla
   docker exec -it arketic_ai-api-1 bash
   alembic downgrade base
   alembic upgrade head
   ```

## Veritabanı Migration Yönetimi

### Alembic Migrations:
```bash
# Docker konteyner içinde
docker exec -it arketic_ai-api-1 bash

# Yeni migration oluştur
alembic revision --autogenerate -m "Description of changes"

# Migration'ları uygula
alembic upgrade head

# Son migration'ı geri al
alembic downgrade -1

# Migration geçmişini görüntüle
alembic history

# Mevcut durumu kontrol et
alembic current
```

### Migration Best Practices:
- Her migration'dan önce veritabanı yedeği alın
- Migration'ları production'a uygulamadan önce staging ortamında test edin
- Rollback planı hazırlayın
- Migration dosyalarını version control'de saklayın

## Klasör Mimarisi Dokümantasyonu

Detaylı klasör yapısı için bakınız: `/home/ali/arketic_ai/FOLDER_ARCHITECTURE.md`

Bu dosya `/apps` dizinindeki tüm servislerin (API, LangChain, Web) detaylı klasör yapısını, dosya organizasyonunu ve modül açıklamalarını içermektedir.