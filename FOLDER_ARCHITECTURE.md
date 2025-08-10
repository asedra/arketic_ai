# Arketic Proje Klasör Mimarisi

## 📁 Proje Kök Dizin Yapısı

```
/home/ali/arketic/
├── apps/                 # Ana uygulama servisleri
│   ├── api/             # FastAPI backend servisi
│   ├── langchain/       # LangChain Node.js servisi
│   └── web/             # Next.js frontend uygulaması
├── scripts/             # Yardımcı ve deployment scriptleri
├── monitoring/          # İzleme ve loglama yapılandırmaları
├── nginx/               # Nginx yapılandırması
├── tools/               # Geliştirme araçları
├── archive/             # Arşivlenmiş dokümantasyon
├── docker-compose.yml   # Docker orkestrasyon
├── CLAUDE.md           # Proje yönergeleri
└── FOLDER_ARCHITECTURE.md # Bu dosya
```

---

## 🚀 /apps/api - FastAPI Backend Servisi

### Genel Bakış
FastAPI tabanlı REST API servisi. PostgreSQL (pgvector), Redis ve AI entegrasyonlarını yönetir.

### Klasör Yapısı

#### 📂 **core/** - Temel Sistem Modülleri
- `config.py` - Uygulama konfigürasyonları ve çevre değişkenleri
- `database.py` - PostgreSQL veritabanı bağlantıları ve session yönetimi
- `redis.py` - Redis cache ve pub/sub işlemleri
- `security.py` - JWT token yönetimi ve güvenlik fonksiyonları
- `monitoring.py` - Sistem monitörleme ve metrikler
- `logging.py` - Loglama yapılandırması
- `dependencies.py` - FastAPI dependency injection
- `exceptions.py` - Özel exception sınıfları
- `types.py` - Tip tanımlamaları

#### 📂 **models/** - SQLAlchemy ORM Modelleri
- `user.py` - Kullanıcı ve organizasyon modelleri
- `chat.py` - Sohbet ve mesaj modelleri
- `assistant.py` - AI asistan tanımlamaları
- `knowledge.py` - Bilgi tabanı ve doküman modelleri
- `form.py` - Dinamik form yapıları
- `settings.py` - Kullanıcı ve sistem ayarları
- `organization.py` - Organizasyon yapıları
- `people.py` - Kişi yönetimi modeli

#### 📂 **routers/** - API Endpoint'leri
- `auth.py` - Kimlik doğrulama ve yetkilendirme
- `chat.py` - Sohbet işlemleri ve WebSocket
- `assistants.py` - Asistan yönetimi
- `knowledge.py` - Bilgi tabanı CRUD işlemleri
- `people.py` - Kişi yönetimi
- `forms.py` - Form oluşturma ve yönetimi
- `settings.py` - Ayarlar API'si
- `openai_settings.py` - OpenAI entegrasyon ayarları
- `vector.py` - Vektör veritabanı işlemleri
- `health.py` - Sistem sağlık kontrolleri
- `monitoring.py` - Metrik ve monitoring endpoint'leri

#### 📂 **services/** - İş Mantığı Servisleri
- `auth_service.py` - Kimlik doğrulama servisi
- `ai_service.py` - AI model entegrasyonları
- `assistant_service.py` - Asistan işlemleri
- `knowledge_service.py` - Doküman işleme ve indeksleme
- `pgvector_service.py` - Vektör veritabanı işlemleri
- `langchain_client.py` - LangChain servisi ile iletişim
- `people_service.py` - Kişi yönetimi servisi
- `forms_service.py` - Form işleme servisi
- `token_service.py` - JWT token yönetimi
- `user_service.py` - Kullanıcı işlemleri

#### 📂 **schemas/** - Pydantic Veri Şemaları
- `auth.py` - Kimlik doğrulama şemaları
- `assistant.py` - Asistan request/response şemaları
- `knowledge.py` - Bilgi tabanı şemaları
- `people.py` - Kişi veri şemaları
- `forms.py` - Form yapı şemaları
- `user.py` - Kullanıcı şemaları
- `chat.py` - Sohbet şemaları

#### 📂 **middleware/** - Ara Katman Yazılımları
- `logging.py` - Request/response loglama
- `rate_limit.py` - Rate limiting
- `security.py` - Güvenlik kontrolleri
- `auth.py` - Kimlik doğrulama middleware

#### 📂 **migrations/** - Alembic Veritabanı Migrasyonları
- `alembic.ini` - Alembic konfigürasyonu
- `env.py` - Migration environment setup
- `script.py.mako` - Migration şablon dosyası
- **versions/** - Migration dosyaları dizini
  - Numerik sıralı migration dosyaları
  - Her migration dosyası veritabanı şema değişikliklerini içerir

#### 📂 **docs/** - API Dokümantasyonu
- **api/** - Endpoint dokümantasyonları
  - `AUTH.md` - Kimlik doğrulama API'leri
  - `CHAT.md` - Sohbet API'leri
  - `ASSISTANTS.md` - Asistan API'leri
  - `KNOWLEDGE.md` - Bilgi yönetimi API'leri
  - `PEOPLE.md` - Kişi yönetimi API'leri
  - `LANGCHAIN.md` - LangChain entegrasyonu
  - `OPENAI_SETTINGS.md` - OpenAI ayarları
- **database/** - Veritabanı dokümantasyonu
  - `POSTGRESQL.md` - PostgreSQL şema dokümantasyonu
  - `REDIS.md` - Redis kullanım dokümantasyonu
- Test dosyaları ve raporları
  - `auth_test.py` - Kimlik doğrulama testleri
  - `chat_test.py` - Sohbet sistemi testleri
  - `assistant_test.py` - Asistan testleri
  - `knowledge_test.py` - Bilgi yönetimi testleri
  - `people_test.py` - Kişi yönetimi testleri
  - `langchain_test.py` - LangChain entegrasyon testleri
  - JSON formatında test raporları

#### 📂 **tests/** - Test Dosyaları
- Unit ve integration test dosyaları
- `test_pgvector_benchmark.py` - Vektör DB performans testleri
- `test_rag_integration.py` - RAG entegrasyon testleri

#### 📂 **uploads/** - Yüklenen Dosyalar
- Kullanıcılar tarafından yüklenen dokümanlar
- Geçici dosya depolama

#### 📂 **logs/** - Log Dosyaları
- Uygulama log dosyaları
- Error ve debug logları

#### 📄 **Ana Dosyalar**
- `main.py` - FastAPI uygulama entry point
- `Dockerfile` - Docker container tanımı
- `requirements.txt` - Python bağımlılıkları
- `.env` - Çevre değişkenleri (production'da gizli)
- `healthcheck.py` - Container health check scripti

---

## 🔗 /apps/langchain - LangChain Node.js Servisi

### Genel Bakış
Node.js tabanlı AI servisi. LangChain framework'ü ile doküman işleme, embedding ve chat özellikleri sağlar.

### Klasör Yapısı

#### 📂 **src/** - Kaynak Kodlar

##### 📂 **config/** - Konfigürasyon
- `config.js` - Uygulama ayarları
- `database.js` - Veritabanı konfigürasyonu
- `redis.js` - Redis konfigürasyonu

##### 📂 **routes/** - API Route'ları
- `chatRoutes.js` - Sohbet endpoint'leri
- `chainRoutes.js` - LangChain zincir işlemleri
- `completionRoutes.js` - Text completion
- `documentRoutes.js` - Doküman yönetimi
- `embeddingRoutes.js` - Embedding oluşturma
- `healthRoutes.js` - Sağlık kontrolleri

##### 📂 **services/** - Servis Katmanı
- `chatService.js` - Sohbet iş mantığı
- `langchainService.js` - LangChain entegrasyonları
- `databaseService.js` - Veritabanı işlemleri
- `redisService.js` - Redis cache yönetimi
- `streamingService.js` - Streaming yanıtlar
- **knowledge/** - Bilgi işleme servisleri
  - **chunking/** - Metin parçalama stratejileri
    - `fixedSizeChunker.js` - Sabit boyutlu parçalama
    - `recursiveChunker.js` - Recursive parçalama
    - `semanticChunker.js` - Anlamsal parçalama
  - **embeddings/** - Embedding servisleri
    - `embeddingService.js` - Vektör oluşturma
  - **parsers/** - Doküman ayrıştırıcılar
    - `pdfParser.js` - PDF işleme
    - `docxParser.js` - Word doküman işleme
    - `markdownParser.js` - Markdown işleme
    - `textParser.js` - Düz metin işleme
  - `documentProcessor.js` - Ana doküman işleyici

##### 📂 **middleware/** - Ara Katmanlar
- `auth.js` - JWT kimlik doğrulama
- `errorHandler.js` - Hata yönetimi
- `rateLimiter.js` - Rate limiting
- `security.js` - Güvenlik kontrolleri
- `validation.js` - Request validasyonu

##### 📂 **websocket/** - WebSocket
- `socketServer.js` - Socket.io server
- `handlers.js` - WebSocket event handler'ları

##### 📂 **utils/** - Yardımcı Fonksiyonlar
- `logger.js` - Winston logger
- `validators.js` - Veri validasyon fonksiyonları

##### 📂 **tests/** - Test Dosyaları
- Unit ve integration testler
- **knowledge/** - Bilgi işleme testleri

#### 📂 **scripts/** - Yardımcı Scriptler
- Geliştirme ve deployment scriptleri

#### 📂 **logs/** - Log Dosyaları
- Servis log dosyaları

#### 📄 **Ana Dosyalar**
- `index.js` - Ana uygulama dosyası
- `package.json` - Node.js bağımlılıkları
- `package-lock.json` - Bağımlılık kilidi
- `Dockerfile` - Docker container tanımı
- `.env` - Çevre değişkenleri
- `jest.config.js` - Jest test konfigürasyonu

---

## 🌐 /apps/web - Next.js Frontend Uygulaması

### Genel Bakış
Next.js 14 App Router kullanılan modern React uygulaması. TypeScript, Tailwind CSS ve shadcn/ui ile geliştirilmiş.

### Klasör Yapısı

#### 📂 **app/** - Next.js App Router

##### 📄 **Ana Dosyalar**
- `layout.tsx` - Root layout
- `page.tsx` - Ana sayfa
- `globals.css` - Global stiller
- `loading.tsx` - Yükleme ekranı
- `not-found.tsx` - 404 sayfası
- `providers.tsx` - React context provider'ları

##### 📂 **Route Dizinleri**
- **login/** - Giriş sayfası
- **signup/** - Kayıt sayfası
- **forgot-password/** - Şifre sıfırlama
- **dashboard/** - Ana kontrol paneli
- **my-organization/** - Organizasyon yönetimi
  - `OptimizedPage.tsx` - Performans optimizasyonlu sayfa
  - `PeopleTab.tsx` - Kişi yönetimi sekmesi
  - **OrgChartTab/** - Organizasyon şeması
  - **ServicesTab/** - Servis yönetimi
  - **IsoTab/** - ISO compliance yönetimi
  - **IsoDocumentsTab/** - Doküman yönetimi
  - **components/** - Organizasyon bileşenleri
  - **mock/** - Mock data
- **knowledge/** - Bilgi tabanı yönetimi
  - **components/** - Bilgi tabanı bileşenleri
  - **types/** - TypeScript tip tanımlamaları
  - **mock/** - Mock data
- **forms/** - Form yönetimi
  - **designer/** - Form tasarım arayüzü
- **api/** - API route'ları
  - **health/** - Sağlık kontrolü
- **api-test/** - API test sayfası

#### 📂 **components/** - React Bileşenleri

##### 📂 **ui/** - Temel UI Bileşenleri (shadcn/ui)
- 50+ temel UI bileşeni
  - `accordion.tsx` - Akordeon bileşeni
  - `alert.tsx` - Uyarı bileşeni
  - `button.tsx` - Buton bileşeni
  - `card.tsx` - Kart bileşeni
  - `dialog.tsx` - Dialog/Modal bileşeni
  - `form.tsx` - Form bileşenleri
  - `input.tsx` - Input bileşeni
  - `select.tsx` - Select bileşeni
  - `table.tsx` - Tablo bileşeni
  - `tabs.tsx` - Tab bileşeni
  - `toast.tsx` - Toast bildirimi
  - Ve diğer UI bileşenleri...
- `delightful-*.tsx` - Özel animasyonlu bileşenler
- `virtualized-list.tsx` - Performans optimizasyonlu listeler
- **__tests__/** - UI bileşen testleri

##### 📂 **dashboard/** - Dashboard Bileşenleri
- `DashboardContainer.tsx` - Ana container
- `Sidebar.tsx` - Yan menü
- `TopBar.tsx` - Üst bar
- **content/** - İçerik bileşenleri
  - `ChatContent.tsx` - Sohbet arayüzü
  - `AssistantsContent.tsx` - Asistan yönetimi
  - `KnowledgeContent.tsx` - Bilgi tabanı
  - `FormsContent.tsx` - Form yönetimi
  - `AnalyticsContent.tsx` - Analitik görünümleri
  - `SettingsContent.tsx` - Ayarlar

##### 📂 **chat/** - Sohbet Bileşenleri
- `ChatWindow.tsx` - Ana sohbet penceresi
- `ChatSidebar.tsx` - Sohbet listesi
- `MessageList.tsx` - Mesaj listesi
- `MessageInput.tsx` - Mesaj girişi
- `AIChatSettings.tsx` - AI ayarları
- `ConnectionStatus.tsx` - Bağlantı durumu
- `TypingIndicator.tsx` - Yazıyor göstergesi
- **__tests__/** - Sohbet bileşen testleri

##### 📂 **forms/** - Form Bileşenleri
- `AdaptiveCardDesigner.tsx` - Adaptive Card tasarımcısı
- `AdvancedCardRenderer.tsx` - Card renderer
- `FormField.tsx` - Form alanları
- `JsonImporter.tsx` - JSON import aracı

##### 📂 **assistant/** - Asistan Bileşenleri
- `KnowledgeSelector.tsx` - Bilgi tabanı seçici
- `AssistantCard.tsx` - Asistan kartı
- `AssistantSettings.tsx` - Asistan ayarları

##### 📂 **auth/** - Kimlik Doğrulama Bileşenleri
- `protected-route.tsx` - Korumalı route wrapper
- `user-dropdown.tsx` - Kullanıcı menüsü
- `token-expiry-indicator.tsx` - Token süre göstergesi
- `LoginForm.tsx` - Giriş formu
- `RegisterForm.tsx` - Kayıt formu

##### 📂 **providers/** - Context Provider'ları
- `ArketicProvider.tsx` - Ana uygulama provider
- `error-provider.tsx` - Hata yönetimi provider
- `auth-provider.tsx` - Kimlik doğrulama provider

##### 📂 **demo/** - Demo Bileşenleri
- Demo ve örnek bileşenler

##### 📂 **debug/** - Debug Bileşenleri
- Geliştirme ortamı debug araçları

#### 📂 **lib/** - Yardımcı Kütüphaneler

##### 📂 **stores/** - Zustand State Store'ları
- `chat-store.ts` - Sohbet state yönetimi
- `assistant-store.ts` - Asistan state yönetimi
- `auth-store.ts` - Kimlik doğrulama state'i
- `organization-store.ts` - Organizasyon state'i
- **__tests__/** - Store testleri

##### 📂 **ai/** - AI Entegrasyonları
- `ai-client.ts` - AI istemci
- `langchain-service.ts` - LangChain servisi
- `vector-store.ts` - Vektör DB işlemleri
- `adaptive-cards-service.ts` - Adaptive Cards servisi

##### 📂 **hooks/** - Custom React Hook'ları
- React custom hook'ları (varsa)

##### 📂 **validation/** - Veri Validasyonu
- Form ve data validasyon kuralları

##### 📄 **Yardımcı Dosyalar**
- `api-client.ts` - API istemci
- `auth.ts` - Kimlik doğrulama fonksiyonları
- `utils.ts` - Genel yardımcı fonksiyonlar
- `config.ts` - Uygulama konfigürasyonu
- `cache.ts` - Cache yönetimi
- `performance.ts` - Performans monitörleme
- `state-manager.ts` - Global state yönetimi
- **__tests__/** - Lib testleri

#### 📂 **hooks/** - Global Custom Hook'lar
- `useApi.ts` - API çağrıları
- `useSession.ts` - Session yönetimi
- `useDebounce.ts` - Debounce hook
- `useLocalStorage.ts` - Local storage
- `useNotifications.ts` - Bildirim yönetimi

#### 📂 **types/** - TypeScript Tip Tanımlamaları
- `auth.ts` - Kimlik doğrulama tipleri
- `index.ts` - Genel tipler
- `api.ts` - API response tipleri
- `forms.ts` - Form tipleri

#### 📂 **data/** - Statik Data
- Mock data ve sabit veriler

#### 📂 **public/** - Statik Dosyalar
- `favicon.ico` - Site ikonu
- `manifest.json` - PWA manifest
- `sw.js` - Service worker
- Placeholder görseller ve statik asset'ler

#### 📂 **styles/** - Stil Dosyaları
- Global CSS dosyaları (varsa)

#### 📄 **Konfigürasyon Dosyaları**
- `next.config.mjs` - Next.js konfigürasyonu
- `tailwind.config.ts` - Tailwind CSS ayarları
- `tsconfig.json` - TypeScript konfigürasyonu
- `middleware.ts` - Next.js middleware
- `components.json` - shadcn/ui konfigürasyonu
- `package.json` - Node.js bağımlılıkları
- `package-lock.json` - Bağımlılık kilidi
- `postcss.config.mjs` - PostCSS konfigürasyonu
- `jest.config.js` - Jest test konfigürasyonu
- `playwright.config.ts` - E2E test konfigürasyonu
- `Dockerfile` - Docker container tanımı
- `.env.local` - Yerel çevre değişkenleri

---

## 📁 /scripts - Yardımcı Scriptler

- `dev-setup.sh` - Geliştirme ortamı kurulumu
- `dev.sh` - Geliştirme sunucusu başlatma
- `docker-dev.sh` - Docker geliştirme ortamı
- `validate-dev-env.sh` - Ortam doğrulama
- `validate-docker-env.py` - Docker ortam doğrulama
- `deploy.sh` - Production deployment
- `backup.sh` - Veritabanı yedekleme
- `restore.sh` - Veritabanı geri yükleme
- `fix-migrations.sh` - Migration düzeltme
- `init-db.sql` - Veritabanı başlangıç scripti
- `migrate-web-app.js` - Web app migration
- `start-dev.sh` - Hızlı başlatma scripti

---

## 📁 /monitoring - İzleme Yapılandırmaları

- `prometheus.yml` - Prometheus metrik toplama
- `loki-config.yml` - Loki log aggregation
- `promtail-config.yml` - Promtail log shipper

---

## 📁 Diğer Dizinler

### 📁 /nginx
- Nginx reverse proxy yapılandırmaları

### 📁 /tools
- Geliştirme ve yardımcı araçlar

### 📁 /archive
- **mockup-docs/** - Arşivlenmiş dokümantasyon
  - **analysis-reports/** - Analiz raporları
  - **reference-configs/** - Referans yapılandırmalar
  - **deployment-configs/** - Deployment yapılandırmaları
  - **documentation/** - Eski dokümantasyon

### 📁 /.claude
- **agents/** - Claude AI agent yapılandırmaları

---

## 🐳 Docker Entegrasyonu

Her servis kendi Dockerfile'ına sahiptir ve docker-compose.yml ile orkestre edilir:

- **API Servisi**: Port 8000, hot-reload aktif
- **LangChain Servisi**: Port 3001, Node.js hot-reload
- **Web Uygulaması**: Port 3000, Next.js fast refresh
- **PostgreSQL + pgvector**: Port 5432, vektör DB desteği
- **Redis**: Port 6379, cache ve pub/sub

## 📊 Servisler Arası İletişim

```
[Web App] --HTTP/WebSocket--> [API Server] --HTTP--> [LangChain Service]
    |                              |                         |
    |                              |                         |
    └──────────────────────────> [Redis] <──────────────────┘
                                   |
                              [PostgreSQL]
```

## 🔑 Önemli Notlar

1. **Mikro servis mimarisi**: Her servis bağımsız olarak ölçeklenebilir
2. **Docker Compose**: Tüm servisler container'larda çalışır
3. **Hot Reload**: Geliştirme ortamında kod değişiklikleri otomatik yansır
4. **Type Safety**: TypeScript kullanımı ile tip güvenliği
5. **API First**: Backend API'ler tam dokümante edilmiş
6. **Modüler Yapı**: Her servis kendi sorumluluk alanına sahip
7. **Test Coverage**: Her servis için kapsamlı test suite'leri
8. **Monitoring**: Prometheus, Loki ile tam izleme desteği