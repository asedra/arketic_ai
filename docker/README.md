# Arketic Docker Development Guide

This guide covers the optimized Docker setup for Arketic development, including best practices for rapid development cycles.

## Quick Start

```bash
# Start development environment
./scripts/dev.sh up

# Check status
./scripts/dev.sh status

# View logs
./scripts/dev.sh logs

# Stop environment
./scripts/dev.sh down
```

## Architecture Overview

The Docker setup consists of:

- **PostgreSQL 15**: Primary database with Alpine Linux for minimal footprint
- **Redis 7**: Caching layer and session storage
- **FastAPI Backend**: Python-based API with hot reloading in development
- **Next.js Frontend**: React-based frontend with fast refresh
- **Nginx**: Reverse proxy for routing and static file serving

## Development Optimizations

### Fast Builds
- Multi-stage Dockerfiles with dedicated development targets
- Optimized layer caching with proper `.dockerignore` files
- Separate dependency and application layers
- Volume mounts for node_modules and Python packages

### Hot Reloading
- **API**: Uvicorn with `--reload` flag and file watching
- **Frontend**: Next.js dev server with fast refresh
- **File Watching**: Configured for container environments

### Health Checks
- Custom health check scripts for reliable service detection
- Reduced intervals for faster development feedback
- Proper startup periods for each service

## Service Configuration

### API Service
```yaml
# Development target with hot reloading
target: development
command: uvicorn main:app --reload --log-level debug

# Volume mounts for live code changes
volumes:
  - ./apps/api:/app
  - /app/.venv  # Exclude virtual environment
```

### Web Service
```yaml
# Development target with fast refresh
target: development
command: npm run dev

# Optimized volume mounts
volumes:
  - ./apps/web:/app
  - web_node_modules:/app/node_modules  # Named volume for performance
```

### Database Services
- PostgreSQL with optimized settings for development
- Redis with persistence disabled for faster startup
- Health checks for dependency management

## Environment Variables

### Required Variables
```bash
# Database
POSTGRES_DB=arketic_dev
POSTGRES_USER=arketic
POSTGRES_PASSWORD=arketic_dev_password

# API Keys (development values)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### Development-Specific Variables
```bash
# Enable development features
NODE_ENV=development
ENVIRONMENT=development
PYTHONUNBUFFERED=1
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

## Volume Management

### Named Volumes
- `postgres_data`: Database persistence
- `redis_data`: Cache persistence
- `web_node_modules`: Node.js dependencies
- `web_next`: Next.js build cache
- `api_uploads`: File uploads
- `api_logs`: Application logs

### Performance Benefits
- Faster dependency installation
- Reduced build times
- Persistent development data

## Networking

### Service Communication
- Internal Docker network: `arketic_dev_network`
- Service discovery via service names
- Proper CORS configuration for cross-origin requests

### Port Mapping
- Frontend: `3000` → `http://localhost:3000`
- API: `8000` → `http://localhost:8000`
- Database: `5432` → `localhost:5432`
- Redis: `6379` → `localhost:6379`
- Nginx: `80` → `http://localhost:80`

## Development Workflow

### Starting Development
```bash
# Clean start
./scripts/dev.sh reset

# Regular start
./scripts/dev.sh up

# Check everything is working
./scripts/dev.sh status
```

### Making Changes
1. Edit source code - changes are automatically reflected
2. API changes trigger automatic reload
3. Frontend changes trigger fast refresh
4. Database changes require migration

### Debugging
```bash
# View specific service logs
./scripts/dev.sh logs api
./scripts/dev.sh logs web

# Execute commands in containers
./scripts/dev.sh exec api bash
./scripts/dev.sh exec web sh

# Database management
./scripts/dev.sh db:migrate
./scripts/dev.sh db:seed
```

### Performance Monitoring
- Health check endpoints for all services
- Logging configured for development debugging
- Resource usage monitoring available

## Troubleshooting

### Common Issues

#### Slow File Watching
```bash
# Enable polling for file systems that don't support inotify
export CHOKIDAR_USEPOLLING=true
export WATCHPACK_POLLING=true
```

#### Port Conflicts
```bash
# Check for conflicting services
sudo lsof -i :3000
sudo lsof -i :8000
```

#### Permission Issues
```bash
# Fix volume permissions
./scripts/dev.sh exec api chown -R arketic:arketic /app
./scripts/dev.sh exec web chown -R nextjs:nodejs /app
```

#### Database Connection Issues
```bash
# Restart database service
docker-compose restart postgres

# Check database logs
./scripts/dev.sh logs postgres
```

### Performance Optimization

#### Docker Performance
- Use named volumes for dependencies
- Optimize .dockerignore files
- Use multi-stage builds effectively
- Enable BuildKit for faster builds

#### Development Speed
- Keep containers running between sessions
- Use development targets in Dockerfiles
- Enable hot reloading and fast refresh
- Optimize health check intervals

## Production Considerations

The development setup is optimized for speed and developer experience. For production:

- Use `docker-compose.prod.yml`
- Build production targets
- Enable proper security settings
- Configure monitoring and logging
- Use environment-specific configurations

## Maintenance

### Regular Tasks
```bash
# Update dependencies
./scripts/dev.sh exec api pip install -r requirements.txt
./scripts/dev.sh exec web npm install

# Clean up unused resources
./scripts/dev.sh clean

# Complete environment reset
./scripts/dev.sh reset
```

### Security Updates
- Regularly update base images
- Update dependency versions
- Review security configurations
- Audit container permissions