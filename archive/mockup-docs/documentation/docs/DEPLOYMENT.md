# 🚀 Arketic Platform - Deployment Guide

This guide provides comprehensive instructions for deploying the Arketic platform in production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Database Setup](#database-setup)
- [Monitoring Setup](#monitoring-setup)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **CPU**: 4+ cores (8+ recommended for production)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 50GB+ SSD storage
- **Network**: Stable internet connection for AI services

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For cloning the repository
- **OpenAI API Key**: For AI functionality

### Optional Requirements
- **Domain Name**: For custom domain setup
- **SSL Certificate**: For HTTPS (or use Let's Encrypt)
- **Load Balancer**: For high availability setups

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and customize:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

Edit `.env` with your production values:

```bash
# =============================================================================
# SECURITY CONFIGURATION (REQUIRED)
# =============================================================================

# Generate secure random keys (minimum 32 characters)
SECRET_KEY=your-super-secure-secret-key-minimum-32-characters-long-change-this
JWT_SECRET_KEY=your-jwt-secret-key-also-minimum-32-characters-long

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-from-platform-openai-com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# PostgreSQL Database
POSTGRES_DB=arketic_prod
POSTGRES_USER=arketic
POSTGRES_PASSWORD=your-secure-database-password-change-this

# Redis Cache
REDIS_PASSWORD=your-secure-redis-password-change-this

# =============================================================================
# DOMAIN AND NETWORK CONFIGURATION
# =============================================================================

# Your domain name (for SSL and routing)
DOMAIN=your-domain.com
API_DOMAIN=api.your-domain.com

# Admin email for SSL certificates
ADMIN_EMAIL=admin@your-domain.com

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

# Environment setting
ENVIRONMENT=production

# CORS origins (comma-separated)
ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com

# =============================================================================
# OPTIONAL CONFIGURATION
# =============================================================================

# Additional AI API Keys (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key-if-using-claude
GROQ_API_KEY=your-groq-api-key-if-using-groq

# Email configuration (for notifications)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-email-password

# Monitoring (optional)
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### 3. Generate Secure Keys

Use these commands to generate secure keys:

```bash
# Generate SECRET_KEY
openssl rand -base64 32

# Generate JWT_SECRET_KEY
openssl rand -base64 32

# Or using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Docker Compose Deployment

### 1. Standard Deployment

For most production deployments, use Docker Compose:

```bash
# Clone repository
git clone https://github.com/arketic/platform.git
cd arketic-platform

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Production Optimization

For production, use the optimized compose file:

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# With resource limits
docker-compose -f docker-compose.prod.yml -f docker-compose.limits.yml up -d
```

### 3. Service Health Checks

Verify all services are running:

```bash
# Check health endpoints
curl https://your-domain.com/health
curl https://api.your-domain.com/health

# Check individual services
docker-compose exec backend curl http://localhost:8000/health
docker-compose exec postgres pg_isready -U arketic
docker-compose exec redis redis-cli ping
```

## Kubernetes Deployment

### 1. Prerequisites

Ensure you have:
- Kubernetes cluster (v1.20+)
- kubectl configured
- Helm (optional, for monitoring)

### 2. Apply Kubernetes Manifests

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy databases
kubectl apply -f k8s/database-deployment.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Setup ingress
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n arketic-platform
kubectl get services -n arketic-platform
```

### 3. Scaling Configuration

```bash
# Scale backend pods
kubectl scale deployment backend --replicas=3 -n arketic-platform

# Auto-scaling setup
kubectl apply -f k8s/hpa.yaml

# Check scaling status
kubectl get hpa -n arketic-platform
```

## Cloud Platform Deployment

### AWS Deployment

#### Using ECS

```bash
# Create ECR repositories
aws ecr create-repository --repository-name arketic/backend
aws ecr create-repository --repository-name arketic/frontend

# Build and push images
./scripts/build-and-push-aws.sh

# Deploy using ECS
aws ecs create-service --cli-input-json file://aws/ecs-service.json
```

#### Using EKS

```bash
# Create EKS cluster
eksctl create cluster --name arketic-cluster --region us-west-2

# Deploy to EKS
kubectl apply -f k8s/
```

### Google Cloud Deployment

```bash
# Build images
gcloud builds submit --tag gcr.io/your-project/arketic-backend backend/
gcloud builds submit --tag gcr.io/your-project/arketic-frontend .

# Deploy to GKE
kubectl apply -f k8s/
```

### Azure Deployment

```bash
# Create container registry
az acr create --resource-group arketic-rg --name arketicregistry --sku Basic

# Build and push
az acr build --registry arketicregistry --image arketic/backend backend/
az acr build --registry arketicregistry --image arketic/frontend .

# Deploy to AKS
kubectl apply -f k8s/
```

## SSL/TLS Configuration

### Automatic SSL with Let's Encrypt

The platform includes automatic SSL certificate generation:

```yaml
# In docker-compose.yml, Traefik is configured for Let's Encrypt
traefik:
  command:
    - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    - "--certificatesresolvers.letsencrypt.acme.email=${ADMIN_EMAIL}"
```

### Manual SSL Certificate

If using custom certificates:

```bash
# Create certificates directory
mkdir -p data/certs

# Copy your certificates
cp your-domain.crt data/certs/
cp your-domain.key data/certs/

# Update docker-compose.yml to use custom certs
```

### SSL Testing

Verify SSL configuration:

```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check SSL rating
curl -I https://your-domain.com
```

## Database Setup

### Initial Database Setup

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Create initial admin user
docker-compose exec backend python scripts/create_admin.py

# Seed sample data (optional)
docker-compose exec backend python scripts/seed_data.py
```

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U arketic arketic_prod > backup.sql

# Automated backup script
./scripts/backup.sh
```

### Database Restore

```bash
# Restore from backup
docker-compose exec -T postgres psql -U arketic arketic_prod < backup.sql
```

## Monitoring Setup

### Built-in Monitoring

The platform includes health check endpoints:

```bash
# System health
curl https://api.your-domain.com/health

# Detailed system status
curl https://api.your-domain.com/api/v1/status

# Service metrics
curl https://api.your-domain.com/metrics
```

### Prometheus and Grafana

Deploy monitoring stack:

```bash
# Deploy monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80
```

### Log Aggregation

Setup centralized logging:

```bash
# Deploy ELK stack
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install filebeat elastic/filebeat
```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

# Database backup
docker-compose exec postgres pg_dump -U arketic arketic_prod > "backup-$(date +%Y%m%d-%H%M%S).sql"

# Redis backup
docker-compose exec redis redis-cli BGSAVE

# File uploads backup
tar -czf "uploads-$(date +%Y%m%d-%H%M%S).tar.gz" data/uploads/

# Upload to cloud storage (example: AWS S3)
aws s3 cp backup-*.sql s3://your-backup-bucket/database/
aws s3 cp uploads-*.tar.gz s3://your-backup-bucket/files/
```

### Disaster Recovery

```bash
#!/bin/bash
# restore.sh

# Stop services
docker-compose down

# Restore database
docker-compose up -d postgres
sleep 30
docker-compose exec -T postgres psql -U arketic arketic_prod < latest-backup.sql

# Restore files
tar -xzf latest-uploads.tar.gz -C data/

# Start all services
docker-compose up -d
```

## Performance Tuning

### Database Optimization

```sql
-- PostgreSQL tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

### Redis Optimization

```bash
# Redis configuration
echo "maxmemory 512mb" >> data/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> data/redis/redis.conf
```

### Application Optimization

```yaml
# Backend scaling
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        memory: 1Gi
        cpu: 1000m
      requests:
        memory: 512Mi
        cpu: 500m
```

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Check resource usage
docker stats

# Restart services
docker-compose restart backend
```

#### Database Connection Issues

```bash
# Test database connection
docker-compose exec backend python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://arketic:password@postgres:5432/arketic_prod')
print('Database connection successful!' if engine.connect() else 'Connection failed')
"
```

#### SSL Certificate Issues

```bash
# Check certificate status
docker-compose logs traefik | grep acme

# Manually renew certificates
docker-compose exec traefik traefik acme renew
```

#### Performance Issues

```bash
# Check resource usage
docker-compose exec backend top
docker-compose exec postgres pg_stat_activity

# Analyze slow queries
docker-compose exec postgres pg_stat_statements
```

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Basic health check |
| `/api/v1/status` | Detailed system status |
| `/metrics` | Prometheus metrics |
| `/docs` | API documentation |

### Log Locations

```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# Proxy logs
docker-compose logs -f traefik
```

### Support Contacts

- **Documentation**: [docs/](../)
- **Issues**: [GitHub Issues](https://github.com/arketic/platform/issues)
- **Emergency**: support@arketic.com

---

## Post-Deployment Checklist

- [ ] All services are running (`docker-compose ps`)
- [ ] Health checks pass (`curl https://your-domain.com/health`)
- [ ] SSL certificates are valid
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] Backup system configured
- [ ] Monitoring configured
- [ ] DNS records configured
- [ ] Firewall rules configured
- [ ] Performance monitoring active

**Congratulations!** Your Arketic platform is now deployed and ready for production use.