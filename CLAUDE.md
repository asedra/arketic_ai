# Arketic Projesi - Önemli Bilgiler

## Backend Dokümantasyonu

Backend dokümantasyonu aşağıdaki dizinlerde bulunmaktadır:

- **Ana Dokümantasyon Dizini:** `/home/ali/arketic/apps/api/docs`
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

## Docker Kullanımı - ÖNEMLİ

Bu sistem **Docker konteynerlerinde** çalışmaktadır. Aşağıdaki servislerin tümü Docker Compose ile yönetilmektedir:

### Çalışan Servisler:
- **PostgreSQL** (pgvector) - Port 5432
- **Redis** - Port 6379  
- **API** (FastAPI) - Port 8000
- **LangChain** - Port 3001
- **Web** (Next.js) - Port 3000

### ⚠️ ÖNEMLİ UYARILAR:

**ASLA** aşağıdaki komutları doğrudan çalıştırmayın:
- ❌ `npm run dev`
- ❌ `uvicorn main:app`
- ❌ `python main.py`
- ❌ `npm start`
- ❌ `yarn dev`

### ✅ Doğru Kullanım:

Servisleri yönetmek için Docker Compose komutlarını kullanın:
- `docker-compose up` - Tüm servisleri başlat
- `docker-compose down` - Tüm servisleri durdur
- `docker-compose logs [servis-adı]` - Logları görüntüle
- `docker-compose restart [servis-adı]` - Servisi yeniden başlat
- `docker exec -it [konteyner-adı] bash` - Konteynere bağlan

### Geliştirme Ortamı:
- Kod değişiklikleri otomatik olarak konteynerlere yansıtılır (volume mount ile)
- Hot-reload aktiftir, dosya değişikliklerinde servisler otomatik yenilenir
- Veritabanı migrasyonları Alembic ile yönetilir

## Proje Yapısı

```
/home/ali/arketic/
├── apps/
│   ├── api/          # FastAPI backend
│   ├── langchain/    # LangChain servisi
│   └── web/          # Next.js frontend
├── docker-compose.yml
├── scripts/          # Yardımcı scriptler
└── monitoring/       # İzleme yapılandırmaları
```