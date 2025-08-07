#!/bin/bash
# Development startup script - starts both frontend and backend

set -e

echo "🚀 Starting Arketic Enterprise Development Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to cleanup background processes
cleanup() {
    echo ""
    print_status "Shutting down development environment..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    print_success "Development environment stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
print_status "Starting backend API server..."
cd apps/api
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ../..
print_success "Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 2

# Start frontend in background
print_status "Starting frontend development server..."
cd apps/web
npm run dev &
FRONTEND_PID=$!
cd ../..
print_success "Frontend started (PID: $FRONTEND_PID)"

echo ""
print_success "🎉 Development environment is running!"
echo ""
echo "🌐 Access your application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Logs:"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "⚠️  Press Ctrl+C to stop all services"

# Wait for background processes
wait