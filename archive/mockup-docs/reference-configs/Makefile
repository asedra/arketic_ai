# Arketic Backend Makefile

.PHONY: help setup dev test test-people test-coverage test-watch clean docker-build docker-run install lint format check migration upgrade

# Default target
help:
	@echo "Arketic Backend Development Commands"
	@echo "===================================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  setup          - Setup development environment"
	@echo "  install        - Install dependencies"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev            - Run development server"
	@echo "  test           - Run all tests"
	@echo "  test-people    - Run People API tests"
	@echo "  test-coverage  - Run tests with coverage"
	@echo "  test-watch     - Run tests in watch mode"
	@echo "  format         - Format code with black and isort"
	@echo "  lint           - Run linting with ruff"
	@echo "  check          - Run all quality checks"
	@echo ""
	@echo "Database Commands:"
	@echo "  migration      - Create new database migration"
	@echo "  upgrade        - Apply database migrations"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run with Docker Compose"
	@echo "  docker-down    - Stop Docker containers"
	@echo ""
	@echo "Utility Commands:"
	@echo "  clean          - Clean temporary files"

# Setup development environment
setup:
	@echo "Setting up development environment..."
	python -m venv venv
	@echo "Virtual environment created. Activate with:"
	@echo "  source venv/bin/activate  # Linux/Mac"
	@echo "  venv\\Scripts\\activate     # Windows"
	@echo ""
	@echo "Then run: make install"

# Install dependencies
install:
	pip install --upgrade pip
	pip install -r requirements.txt
	@echo "Dependencies installed successfully!"

# Run development server
dev:
	@echo "Starting development server..."
	python main.py

# Run development server with auto-reload
dev-reload:
	@echo "Starting development server with auto-reload..."
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
test:
	@echo "Running all tests..."
	python -m pytest tests/ -v --tb=short

# Run People API tests specifically
test-people:
	@echo "Running People API tests..."
	python run_people_tests.py -v

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	python run_people_tests.py --coverage

# Run tests in watch mode (requires pytest-watch)
test-watch:
	@echo "Running tests in watch mode..."
	python -m pytest tests/test_people_api.py -v --tb=short -f

# Format code
format:
	@echo "Formatting code..."
	black . --line-length 100
	isort . --profile black

# Run linting
lint:
	@echo "Running linting..."
	ruff check .
	mypy . --ignore-missing-imports

# Run all quality checks
check: format lint test
	@echo "All quality checks completed!"

# Create database migration
migration:
	@echo "Creating database migration..."
	@read -p "Migration description: " desc; \
	alembic revision --autogenerate -m "$$desc"

# Apply database migrations
upgrade:
	@echo "Applying database migrations..."
	alembic upgrade head

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t arketic-backend:latest .

# Run with Docker Compose
docker-run:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d

# Stop Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

# View Docker logs
docker-logs:
	docker-compose logs -f backend

# Clean temporary files
clean:
	@echo "Cleaning temporary files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache/ .coverage htmlcov/ .mypy_cache/ .ruff_cache/
	@echo "Temporary files cleaned!"

# Install pre-commit hooks
pre-commit:
	pip install pre-commit
	pre-commit install

# Run pre-commit on all files
pre-commit-all:
	pre-commit run --all-files

# Database reset (development only)
db-reset:
	@echo "WARNING: This will delete all data in the database!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		alembic downgrade base; \
		alembic upgrade head; \
		echo "Database reset completed!"; \
	else \
		echo "Database reset cancelled."; \
	fi

# Show application info
info:
	@echo "Arketic Backend Information"
	@echo "=========================="
	@echo "Python version: $$(python --version)"
	@echo "FastAPI app: main:app"
	@echo "Development URL: http://localhost:8000"
	@echo "API Documentation: http://localhost:8000/api/docs"
	@echo "Health Check: http://localhost:8000/health"

# Production deployment
deploy-staging:
	@echo "Deploying to staging..."
	# Add staging deployment commands here

deploy-prod:
	@echo "Deploying to production..."
	# Add production deployment commands here