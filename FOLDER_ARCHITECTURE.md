# Arketic Proje Klasör Mimarisi

## 📁 /apps Dizini Yapısı

Bu dokümantasyon, Arketic projesinin `/apps` klasöründeki üç ana servisin detaylı yapısını açıklamaktadır.

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

#### 📂 **routers/** - API Endpoint'leri
- `auth.py` - Kimlik doğrulama ve yetkilendirme
- `chat.py` - Sohbet işlemleri
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

#### 📂 **middleware/** - Ara Katman Yazılımları
- `logging.py` - Request/response loglama
- `rate_limit.py` - Rate limiting
- `security.py` - Güvenlik kontrolleri

#### 📂 **migrations/** - Alembic Veritabanı Migrasyonları
- `versions/` - Sıralı migration dosyaları
  - `001_initial_setup.py` - İlk kurulum
  - `002_auth_tables.py` - Kimlik doğrulama tabloları
  - `003_people_table.py` - Kişi tablosu
  - `004_chat_tables.py` - Sohbet tabloları
  - `005_forms_tables.py` - Form tabloları
  - `006_assistants_tables.py` - Asistan tabloları
  - `007_knowledge_tables.py` - Bilgi tabanı tabloları
  - `008_settings_tables.py` - Ayarlar tabloları
  - `009_add_default_user.py` - Varsayılan kullanıcı
  - `010_assistant_knowledge_associations.py` - İlişki tabloları

#### 📂 **docs/** - API Dokümantasyonu
- `api/` - Endpoint dokümantasyonları
  - `AUTH.md` - Kimlik doğrulama API'leri
  - `CHAT.md` - Sohbet API'leri
  - `ASSISTANTS.md` - Asistan API'leri
  - `KNOWLEDGE.md` - Bilgi yönetimi API'leri
  - `PEOPLE.md` - Kişi yönetimi API'leri
  - `LANGCHAIN.md` - LangChain entegrasyonu
  - `OPENAI_SETTINGS.md` - OpenAI ayarları
- `database/` - Veritabanı dokümantasyonu
  - `POSTGRESQL.md` - PostgreSQL şema dokümantasyonu
  - `REDIS.md` - Redis kullanım dokümantasyonu

#### 📂 **tests/** - Test Dosyaları
- Test suitleri ve benchmark testleri
- `test_pgvector_benchmark.py` - Vektör DB performans testleri

#### 📄 **Ana Dosyalar**
- `main.py` - FastAPI uygulama entry point
- `Dockerfile` - Docker container tanımı
- `requirements.txt` - Python bağımlılıkları
- `alembic.ini` - Alembic konfigürasyonu
- `healthcheck.py` - Container health check

---

## 🔗 /apps/langchain - LangChain Node.js Servisi

### Genel Bakış
Node.js tabanlı AI servisi. LangChain framework'ü ile doküman işleme, embedding ve chat özellikleri sağlar.

### Klasör Yapısı

#### 📂 **src/** - Kaynak Kodlar

##### 📂 **config/** - Konfigürasyon
- `config.js` - Uygulama ayarları
- `index.js` - Konfigürasyon export'ları

##### 📂 **routes/** - API Route'ları
- `chain.js` - LangChain zincir işlemleri
- `chat.js` - Sohbet endpoint'leri
- `completion.js` - Text completion
- `documents.js` - Doküman yönetimi
- `embedding.js` - Embedding oluşturma
- `health.js` - Sağlık kontrolleri

##### 📂 **services/** - Servis Katmanı
- `chatService.js` - Sohbet iş mantığı
- `langchain.js` - LangChain entegrasyonları
- `databaseService.js` - Veritabanı işlemleri
- `redisService.js` - Redis cache yönetimi
- `streamingService.js` - Streaming yanıtlar
- `socket.js` - WebSocket yönetimi

##### 📂 **services/knowledge/** - Bilgi İşleme
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

##### 📂 **utils/** - Yardımcı Fonksiyonlar
- `logger.js` - Winston logger

##### 📂 **tests/** - Test Dosyaları
- Unit ve integration testler
- `chatService.test.js` - Chat servis testleri
- `knowledge/` - Bilgi işleme testleri

#### 📄 **Ana Dosyalar**
- `index.js` - Ana uygulama dosyası
- `package.json` - Node.js bağımlılıkları
- `Dockerfile` - Docker container tanımı
- `jest.config.js` - Jest test konfigürasyonu

---

## 🌐 /apps/web - Next.js Frontend Uygulaması

### Genel Bakış
Next.js 14 App Router kullanılan modern React uygulaması. TypeScript, Tailwind CSS ve shadcn/ui ile geliştirilmiş.

### Klasör Yapısı

#### 📂 **app/** - Next.js App Router

##### 📄 **Ana Sayfalar**
- `page.tsx` - Ana sayfa
- `layout.tsx` - Root layout
- `globals.css` - Global stiller
- `loading.tsx` - Yükleme ekranı
- `not-found.tsx` - 404 sayfası

##### 📂 **Sayfa Dizinleri**
- **login/** - Giriş sayfası
- **signup/** - Kayıt sayfası
- **forgot-password/** - Şifre sıfırlama
- **dashboard/** - Ana kontrol paneli
- **my-organization/** - Organizasyon yönetimi
  - `OptimizedPage.tsx` - Performans optimizasyonlu sayfa
  - `PeopleTab.tsx` - Kişi yönetimi sekmesi
  - `OrgChartTab/` - Organizasyon şeması
  - `ServicesTab/` - Servis yönetimi
  - `IsoTab/` - ISO compliance yönetimi
  - `IsoDocumentsTab/` - Doküman yönetimi
- **knowledge/** - Bilgi tabanı yönetimi
  - `ComplianceLibraryTab.tsx` - Uyumluluk kütüphanesi
  - `components/` - Bilgi tabanı bileşenleri
- **forms/** - Form tasarımcısı
  - `designer/` - Form tasarım arayüzü
- **api/** - API route'ları
  - `health/` - Sağlık kontrolü

#### 📂 **components/** - React Bileşenleri

##### 📂 **ui/** - Temel UI Bileşenleri (shadcn/ui)
- 50+ temel UI bileşeni (button, dialog, form, table vb.)
- `delightful-*.tsx` - Özel animasyonlu bileşenler
- `virtualized-list.tsx` - Performans optimizasyonlu listeler

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

##### 📂 **forms/** - Form Bileşenleri
- `AdaptiveCardDesigner.tsx` - Adaptive Card tasarımcısı
- `AdvancedCardRenderer.tsx` - Card renderer
- `FormField.tsx` - Form alanları
- `JsonImporter.tsx` - JSON import aracı

##### 📂 **assistant/** - Asistan Bileşenleri
- `KnowledgeSelector.tsx` - Bilgi tabanı seçici

##### 📂 **auth/** - Kimlik Doğrulama Bileşenleri
- `protected-route.tsx` - Korumalı route wrapper
- `user-dropdown.tsx` - Kullanıcı menüsü
- `token-expiry-indicator.tsx` - Token süre göstergesi

##### 📂 **providers/** - Context Provider'ları
- `ArketicProvider.tsx` - Ana uygulama provider
- `error-provider.tsx` - Hata yönetimi provider

##### 📂 **optimized/** - Performans Optimizasyonlu Bileşenler
- `LazyImage.tsx` - Lazy loading resimler
- `VirtualizedTable.tsx` - Sanal tablo
- `VirtualizedOrgChart.tsx` - Sanal org şeması

#### 📂 **lib/** - Yardımcı Kütüphaneler

##### 📂 **stores/** - Zustand State Store'ları
- `chat-store.ts` - Sohbet state yönetimi
- `assistant-store.ts` - Asistan state yönetimi

##### 📂 **ai/** - AI Entegrasyonları
- `ai-client.ts` - AI istemci
- `langchain-service.ts` - LangChain servisi
- `vector-store.ts` - Vektör DB işlemleri
- `adaptive-cards-service.ts` - Adaptive Cards servisi

##### 📂 **hooks/** - Custom React Hook'ları
- `useApi.ts` - API çağrıları
- `useSession.ts` - Session yönetimi
- `useDebounce.ts` - Debounce hook
- `useLocalStorage.ts` - Local storage
- `useNotifications.ts` - Bildirim yönetimi

##### 📂 **validation/** - Veri Validasyonu
- Form ve data validasyon kuralları

##### 📄 **Yardımcı Dosyalar**
- `api-client.ts` - API istemci
- `auth.ts` - Kimlik doğrulama fonksiyonları
- `utils.ts` - Genel yardımcı fonksiyonlar
- `config.ts` - Uygulama konfigürasyonu
- `cache.ts` - Cache yönetimi
- `performance.ts` - Performans monitörleme

#### 📂 **types/** - TypeScript Tip Tanımlamaları
- `auth.ts` - Kimlik doğrulama tipleri
- `index.ts` - Genel tipler

#### 📂 **public/** - Statik Dosyalar
- `favicon.ico` - Site ikonu
- `manifest.json` - PWA manifest
- `sw.js` - Service worker
- Placeholder görseller

#### 📂 **styles/** - Stil Dosyaları
- `globals.css` - Global CSS ve Tailwind direktifleri

#### 📄 **Konfigürasyon Dosyaları**
- `next.config.mjs` - Next.js konfigürasyonu
- `tailwind.config.ts` - Tailwind CSS ayarları
- `tsconfig.json` - TypeScript konfigürasyonu
- `middleware.ts` - Next.js middleware
- `components.json` - shadcn/ui konfigürasyonu
- `playwright.config.ts` - E2E test konfigürasyonu

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