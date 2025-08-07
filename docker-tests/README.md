# Arketic Docker-First Test Suite

A comprehensive Docker-first testing framework for the Arketic application that ensures all tests run in a controlled, containerized environment.

## 🎯 Overview

This test suite follows a **Docker-First approach** where:
- All tests run against fresh Docker containers
- The first test process verifies Docker application startup
- All subsequent tests use the same Docker environment
- Tests are executed in a controlled, reproducible environment
- No external dependencies or development environments are used

## 🏗️ Test Architecture

```
docker-tests/
├── README.md                     # This documentation
├── package.json                  # Dependencies and scripts
├── run-tests.js                  # Main test execution script
├── config/
│   └── test-config.js           # Test configuration
├── utils/
│   ├── docker-manager.js        # Docker environment management
│   ├── test-logger.js           # Structured test logging
│   └── test-utilities.js        # Common test utilities
├── tests/
│   ├── 01-docker-startup.test.js      # Docker startup verification
│   └── 02-database-connectivity.test.js # Database connectivity tests
├── logs/                        # Test execution logs
├── reports/                     # Test reports and results
└── debug-logs/                  # Docker logs for debugging
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 16+ installed
- Access to the Arketic project root directory

### Installation

```bash
# Navigate to the docker-tests directory
cd /home/ali/arketic/docker-tests

# Install dependencies
npm install
```

### Running Tests

```bash
# Run complete test suite (recommended)
npm test

# Run specific tests
npm run test:startup      # Docker startup test only
npm run test:database     # Database connectivity test only

# Development and debugging
npm run test:watch        # Watch mode
npm run test:debug        # Debug mode
```

### Quick Commands

```bash
# Check Docker environment status
npm run status

# View Docker logs
npm run logs

# Clean up Docker environment
npm run clean
```

## 📋 Test Process Overview

### Phase 1: Environment Preparation
The test suite starts by ensuring a clean Docker environment:

1. **Stop All Containers**: Stops any existing Docker containers
2. **Clean Resources**: Removes containers, networks, and volumes
3. **Fresh Start**: Starts completely fresh Docker environment

### Phase 2: Test Execution

#### Test 1: Docker Application Startup Test
**File**: `tests/01-docker-startup.test.js`

**Purpose**: This is the foundation test that establishes the Docker environment for all subsequent tests.

**What it does**:
- Stops all existing Docker containers
- Starts fresh Docker environment with `docker compose up -d`
- Verifies all services start successfully (PostgreSQL, Redis, API, Web, Nginx)
- Checks health status of all containers
- Tests basic connectivity between services
- Validates service integration (API↔DB, API↔Redis, Web↔API, Nginx↔Services)
- Confirms environment is ready for comprehensive testing

**Critical Requirements**:
- Must pass for all subsequent tests to run
- Establishes the Docker environment used by all other tests
- Takes 2-5 minutes to complete depending on system performance

#### Test 2: Database Connectivity Test
**File**: `tests/02-database-connectivity.test.js`

**Purpose**: Comprehensive database functionality testing using the Docker environment from Test 1.

**What it does**:
- Tests PostgreSQL connection and basic operations
- Validates database schema and migrations
- Tests Redis connection and caching functionality
- Performs database performance and connection pooling tests
- Verifies data persistence and consistency
- Tests cross-container database communication
- Validates API database connectivity through Docker network

## 🔧 Configuration

### Test Configuration
Edit `config/test-config.js` to customize:

```javascript
const TEST_CONFIG = {
  docker: {
    composeFile: '../../docker-compose.yml',
    services: ['postgres', 'redis', 'api', 'web', 'nginx'],
    healthCheckTimeout: 120000, // 2 minutes
  },
  endpoints: {
    api: { baseUrl: 'http://localhost:8000' },
    web: { baseUrl: 'http://localhost:3000' },
    nginx: { baseUrl: 'http://localhost:80' },
  },
  performance: {
    apiResponseTime: 500,    // 500ms max
    webPageLoad: 2000,       // 2s max
    databaseQuery: 100,      // 100ms max
  }
};
```

### Environment Variables

```bash
# Cleanup Docker environment after tests (default: false)
export CLEANUP_AFTER_TESTS=true

# Set log level (info, debug, warn, error)
export TEST_LOG_LEVEL=debug
```

## 📊 Test Results and Reporting

### Real-Time Output
Tests provide real-time console output with:
- ✅ Passed tests with duration
- ❌ Failed tests with error details
- 📊 Performance metrics
- 🐳 Docker status updates

### Generated Reports

#### Test Execution Log
Location: `logs/test-execution.log`
```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"INFO","message":"Test passed: Docker startup","elapsed":45000}
```

#### Summary Report
Location: `reports/test-report-[timestamp].json`
```json
{
  "summary": {
    "totalTests": 2,
    "passed": 2,
    "failed": 0,
    "totalDuration": 180000
  },
  "results": [...],
  "environment": {...}
}
```

#### Failure Reports
Location: `reports/failure-report-[timestamp].json`
- Detailed error information
- Stack traces
- Docker container states
- Debug information

## 🛠️ Docker Environment Management

### Automatic Management
The test suite automatically manages Docker containers:

```javascript
// Before tests: Clean startup
await dockerManager.stopAllContainers();
await dockerManager.cleanup();
await dockerManager.startFreshEnvironment();

// During tests: Health monitoring
await dockerManager.waitForHealthy();
const stats = await dockerManager.getContainerStats();

// After tests: Optional cleanup
if (cleanup) await dockerManager.stopEnvironment();
```

### Manual Docker Commands

```bash
# Start Docker environment manually
docker compose up -d

# Check container status
docker compose ps

# View logs
docker compose logs -f

# Stop environment
docker compose down -v

# Complete cleanup
docker system prune -f --volumes
```

## 📈 Performance Monitoring

### Automatic Performance Tracking
Tests automatically monitor and log:
- API response times
- Database query performance
- Container resource usage
- Memory consumption
- Network latency

### Performance Thresholds
Configure in `test-config.js`:
```javascript
performance: {
  apiResponseTime: 500,    // API calls must complete within 500ms
  webPageLoad: 2000,       // Web pages must load within 2s
  databaseQuery: 100,      // DB queries must complete within 100ms
  memoryUsage: 512,        // Max 512MB per service
}
```

## 🔍 Debugging and Troubleshooting

### Common Issues

#### 1. Docker Startup Failures
```bash
# Check Docker daemon
sudo systemctl status docker

# Check available resources
docker system df

# Manual container inspection
docker compose ps
docker compose logs [service-name]
```

#### 2. Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :3000

# Kill processes using ports
sudo kill -9 $(sudo lsof -t -i:8000)
```

#### 3. Database Connection Issues
```bash
# Test PostgreSQL connectivity
docker compose exec postgres pg_isready -U arketic

# Test Redis connectivity  
docker compose exec redis redis-cli ping
```

### Debug Mode
Run tests in debug mode:
```bash
npm run test:debug
```

### Collecting Debug Information
Failed tests automatically collect:
- Container logs
- Docker stats
- Network information
- Environment variables

### Manual Debug Collection
```bash
# Collect all container logs
for service in postgres redis api web nginx; do
  docker compose logs $service > debug-$service.log
done

# Get container stats
docker stats --no-stream

# Inspect container health
docker compose ps --format json
```

## 📝 Writing Additional Tests

### Test Structure Template
```javascript
describe('Your Test Suite', () => {
  let dockerManager, logger, testUtils;

  beforeAll(async () => {
    logger = new TestLogger();
    dockerManager = new DockerManager();
    testUtils = new TestUtilities(logger);
    
    // Verify Docker environment is running
    if (!dockerManager.isRunning) {
      await dockerManager.startFreshEnvironment();
    }
  });

  test('should test something', async () => {
    const startTime = Date.now();
    logger.logTestStart('Test something');
    
    try {
      // Test implementation
      const result = await testUtils.makeRequest('GET', '/api/endpoint');
      expect(result.success).toBe(true);
      
      const duration = Date.now() - startTime;
      logger.logTestPass('Test something', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logTestFail('Test something', duration, error);
      throw error;
    }
  });
});
```

### Best Practices

1. **Use the Docker Environment**: Always test against the Docker containers, never local development environment
2. **Test Ordering**: Ensure your tests can run after the startup and database tests
3. **Resource Cleanup**: Clean up test data but don't stop Docker containers
4. **Error Handling**: Use the logger for consistent error reporting
5. **Performance Monitoring**: Include performance assertions where relevant

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Docker-First Tests
on: [push, pull_request]

jobs:
  docker-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd docker-tests
          npm install
      
      - name: Run Docker-First Tests
        run: |
          cd docker-tests
          npm test
        env:
          CLEANUP_AFTER_TESTS: true
      
      - name: Upload test reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: docker-tests/reports/
```

## 📚 Additional Resources

### Docker Documentation
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Docker Networking](https://docs.docker.com/network/)

### Testing Documentation
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Supertest for HTTP Testing](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Arketic Specific
- [Application Architecture](../README.md)
- [Docker Development Guide](../DOCKER-DEV.md)
- [API Documentation](../apps/api/README.md)

## 🤝 Contributing

### Adding New Tests
1. Create new test file in `tests/` directory
2. Follow naming convention: `03-your-test.test.js`
3. Update `run-tests.js` to include your test
4. Add documentation to this README
5. Test with `npm test` before submitting

### Modifying Existing Tests
1. Ensure changes don't break the Docker-first approach
2. Update documentation if configuration changes
3. Test thoroughly in fresh environment
4. Update performance thresholds if needed

### Reporting Issues
When reporting issues, include:
- Test execution logs from `logs/`
- Docker container status: `docker compose ps`
- System information: OS, Docker version, Node.js version
- Steps to reproduce the issue

## 📋 Test Execution Checklist

Before running tests, ensure:
- [ ] Docker daemon is running
- [ ] No conflicting services on ports 80, 3000, 5432, 6379, 8000
- [ ] Sufficient disk space (>2GB free)
- [ ] Node.js 16+ installed
- [ ] Test dependencies installed (`npm install`)

## 🎉 Success Criteria

Tests are considered successful when:
- [ ] All Docker containers start and become healthy
- [ ] Database connections are established and functional
- [ ] API endpoints respond correctly
- [ ] Web application loads properly
- [ ] All services can communicate through Docker network
- [ ] Performance thresholds are met
- [ ] No memory leaks or resource issues detected

---

**Note**: This test suite is designed to be the definitive validation of the Arketic application's Docker deployment. All tests must pass before considering the application ready for production deployment.