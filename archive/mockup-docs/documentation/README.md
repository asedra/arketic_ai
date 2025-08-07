# Arketic Backend

A production-ready FastAPI backend for the Arketic AI platform, providing authentication, user management, and a foundation for advanced AI features.

## Features

### Core Features (Phase 1 - Implemented)
- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user registration, profile management, and preferences
- **Database Management**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Security**: Comprehensive security middleware with rate limiting and input validation
- **Monitoring**: Health checks, metrics collection, and structured logging
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation

### Advanced Features (Phase 2 - Planned)
- **AI Integration**: Support for OpenAI, Anthropic, Groq, and local models
- **Vector Search**: Document embedding and similarity search
- **Document Processing**: File upload, text extraction, and indexing
- **Workflow Automation**: Visual workflow builder and execution engine
- **Real-time Chat**: WebSocket-based AI conversations
- **Cost Management**: AI usage tracking and budget alerts

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 12+
- Redis 6+ (optional, for caching and rate limiting)

### Installation

1. **Clone and setup**:
```bash
cd backend/
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment Configuration**:
```bash
cp .env.example .env
# Edit .env with your database and API keys
```

3. **Database Setup**:
```bash
# Create PostgreSQL database
createdb arketic

# Run migrations
alembic upgrade head
```

4. **Start the server**:
```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/arketic
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_EXPIRE_MINUTES=30

# AI Services (Phase 2)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Features
ENABLE_METRICS=true
ENABLE_COST_TRACKING=true
```

See `.env.example` for all available options.

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user info

### User Management
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/preferences` - Get user preferences
- `PUT /api/v1/users/preferences` - Update preferences
- `GET /api/v1/users/admin/users` - List users (admin)

### System
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health
- `GET /metrics` - Prometheus metrics
- `GET /status` - System status (authenticated)

## Database Schema

### Core Models
- **User**: Authentication and basic user info
- **UserProfile**: Extended profile information
- **UserPreferences**: User application preferences
- **Organization**: Multi-tenant organization support
- **OrganizationMember**: Organization membership and roles

### Advanced Models (Phase 2)
- **Chat/ChatMessage**: Real-time messaging
- **KnowledgeBase/Document**: Document management
- **Workflow**: Automation workflows

## Development

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html
```

### Code Quality

```bash
# Format code
black .
isort .

# Type checking
mypy .

# Linting
ruff check .
```

## Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive health with dependencies
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Metrics
Prometheus metrics available at `/metrics`:
- HTTP request metrics
- Database connection pool metrics
- System resource usage
- Custom business metrics

### Logging
Structured JSON logging with:
- Request/response logging
- Security event logging
- Performance monitoring
- Error tracking

## Security

### Implemented Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: bcrypt hashing with strength validation
- **Rate Limiting**: Per-IP and per-user rate limits
- **Input Validation**: SQL injection and XSS prevention
- **Security Headers**: CSRF, XSS, and clickjacking protection
- **Audit Logging**: Security event tracking

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## Production Deployment

### Docker Production
```bash
# Build production image
docker build -t arketic-backend:latest .

# Run with environment variables
docker run -d \
  --name arketic-backend \
  -p 8000:8000 \
  --env-file .env.production \
  arketic-backend:latest
```

### Kubernetes
See `k8s/` directory for Kubernetes manifests.

### Environment-Specific Settings
- **Development**: Debug enabled, detailed logging, auto-reload
- **Staging**: Production-like with additional logging
- **Production**: Optimized performance, minimal logging, security hardened

## Architecture

### Directory Structure
```
backend/
├── alembic/              # Database migrations
├── core/                 # Core functionality
│   ├── config.py        # Configuration management
│   ├── database.py      # Database connection and session management
│   ├── monitoring.py    # Metrics and health checks
│   └── security.py      # Authentication and security utilities
├── middleware/          # FastAPI middleware
│   ├── logging.py       # Request/response logging
│   ├── rate_limit.py    # Rate limiting
│   └── security.py      # Security middleware
├── models/              # SQLAlchemy models
├── routers/             # API route handlers
└── services/            # Business logic services (Phase 2)
```

### Design Principles
- **Clean Architecture**: Separation of concerns with clear boundaries
- **Security First**: Comprehensive security at every layer
- **Observability**: Extensive monitoring and logging
- **Scalability**: Designed for horizontal scaling
- **Maintainability**: Well-documented and tested code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run quality checks
5. Submit a pull request

### Development Workflow
```bash
# Setup development environment
make setup

# Run development server
make dev

# Run tests
make test

# Run all quality checks
make check
```

## Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql postgresql://username:password@localhost:5432/arketic
```

**Migration Issues**:
```bash
# Check current migration status
alembic current

# Reset migrations (development only)
alembic downgrade base
alembic upgrade head
```

**Import Errors**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Support

- **Documentation**: See `/api/docs` when running
- **Issues**: GitHub Issues
- **Development**: See CONTRIBUTING.md

## License

Copyright (c) 2024 Arketic. All rights reserved.