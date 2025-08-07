#!/bin/bash
# Arketic Enterprise Development Setup Script
# Single command to set up the entire development environment

set -e  # Exit on any error

echo "🚀 Setting up Arketic Enterprise Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the arketic root directory"
    exit 1
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install
print_success "Root dependencies installed"

# Install web app dependencies
print_status "Installing web app dependencies..."
cd apps/web
npm install
cd ../..
print_success "Web app dependencies installed"

# Setup Python virtual environment for API
print_status "Setting up Python virtual environment for API..."
cd apps/api
if [[ ! -d "venv" ]]; then
    python3 -m venv venv
    print_success "Python virtual environment created"
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt
print_success "API dependencies installed"
cd ../..

# Create environment files if they don't exist
print_status "Setting up environment files..."

# Web app environment
if [[ ! -f "apps/web/.env.local" ]]; then
    cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_ENV=development
EOF
    print_success "Created apps/web/.env.local"
fi

# API environment
if [[ ! -f "apps/api/.env" ]]; then
    cat > apps/api/.env << EOF
ENVIRONMENT=development
DATABASE_URL=sqlite:///./arketic_enterprise.db
SECRET_KEY=arketic-dev-secret-key-change-in-production-32-chars-minimum
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
    print_success "Created apps/api/.env"
fi

# Create development database
print_status "Setting up development database..."
cd apps/api
source venv/bin/activate
python -c "
import sqlite3
conn = sqlite3.connect('arketic_enterprise.db')
conn.execute('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY, status TEXT)')
conn.execute('INSERT OR REPLACE INTO health_check (id, status) VALUES (1, \"healthy\")')
conn.commit()
conn.close()
print('Development database initialized')
"
cd ../..
print_success "Development database setup complete"

# Make scripts executable
chmod +x scripts/*.sh
print_success "Scripts made executable"

print_success "🎉 Development environment setup complete!"

echo ""
echo "🔧 Available commands:"
echo "  npm run dev          - Start both frontend and backend"
echo "  npm run dev:web      - Start only frontend (port 3000)"
echo "  npm run dev:api      - Start only backend (port 8000)"
echo "  npm run build        - Build all applications"
echo "  npm run test         - Run all tests"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "🚀 Quick start: npm run dev"