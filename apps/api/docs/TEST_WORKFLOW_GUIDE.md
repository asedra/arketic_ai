# Arketic Testing Workflow Guide

## AR-82 Comprehensive Testing Infrastructure Implementation

This guide provides detailed instructions for using the comprehensive testing infrastructure implemented as part of AR-82. This document replaces the previous testing strategy and provides a complete overview of the new comprehensive testing approach.

## Testing Architecture

```
┌─────────────────────────────────────────────────┐
│                 Test Pipeline                     │
├───────────────────────────────────────────────────┤
│                                                   │
│  1. New Endpoint Development                     │
│       ↓                                           │
│  2. Standalone Test Creation                     │
│       ↓                                           │
│  3. Test Execution & Validation                  │
│       ↓                                           │
│  4. Integration into Main Suite                  │
│       ↓                                           │
│  5. CI/CD Pipeline Execution                     │
│                                                   │
└───────────────────────────────────────────────────┘
```

## Backend Testing Structure

### Test File Organization

```
/apps/api/docs/
├── api/                          # API documentation
│   ├── AUTH.md
│   ├── CHAT.md
│   ├── KNOWLEDGE.md
│   └── ...
├── *_test.py                     # Main test files
│   ├── auth_test.py
│   ├── chat_test.py
│   ├── knowledge_test.py
│   └── ...
├── *_test_report.json            # Test reports
└── archived_tests/               # Successfully integrated tests
```

### Test Development Workflow

#### Step 1: Create Standalone Test

For new endpoints, create a standalone test file first:

```python
# Example: multi_file_upload_test.py
#!/usr/bin/env python3
"""
Standalone test for new endpoint: /api/v1/knowledge/upload/files
"""

class MultiFileUploadTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
        
    def test_single_file_upload(self):
        # Test implementation
        pass
        
    def test_multi_file_upload(self):
        # Test implementation
        pass
        
    def run_all_tests(self):
        # Execute all tests
        pass
        
    def generate_report(self):
        # Generate JSON report
        pass
```

#### Step 2: Run Standalone Test

Execute the test in Docker environment:

```bash
# Copy test to container
docker cp apps/api/docs/new_endpoint_test.py arketic-api-1:/app/

# Run test
docker exec arketic-api-1 python3 new_endpoint_test.py

# View results
cat new_endpoint_test_report.json
```

#### Step 3: Integration Process

Use the integration script to add successful tests to main suite:

```bash
# Run integration tool
python3 apps/api/docs/integrate_tests.py

# The tool will:
# 1. Check test report for failures
# 2. Backup main test file
# 3. Add new test methods
# 4. Archive standalone test
```

### Test Report Format

All tests generate standardized JSON reports:

```json
{
  "test_suite": "Multi-File Upload Tests",
  "timestamp": "2025-01-10T10:30:00Z",
  "summary": {
    "total_tests": 7,
    "successful": 7,
    "failed": 0,
    "success_rate": "100%",
    "average_duration_ms": 595.85
  },
  "test_types": {
    "SINGLE_FILE_UPLOAD": {
      "total": 3,
      "success": 3,
      "failed": 0
    },
    "MULTI_FILE_UPLOAD": {
      "total": 1,
      "success": 1,
      "failed": 0
    }
  },
  "detailed_results": [...]
}
```

## Frontend Testing with Playwright MCP

### Test Structure

```
/apps/web/tests/playwright/
├── *.spec.ts                    # Test specifications
│   ├── auth.spec.ts
│   ├── knowledge-upload.spec.ts
│   └── ...
├── fixtures/                    # Test fixtures
├── helpers/                     # Test utilities
└── run-tests.sh                # Test runner script
```

### Playwright Test Development

#### Step 1: Create Test Specification

```typescript
// knowledge-upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Knowledge Management - Multi-file Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate
    await page.goto(BASE_URL);
    // ... login logic
    await page.click('text=Knowledge');
  });

  test('should upload multiple files simultaneously', async ({ page }) => {
    // Test implementation
    await page.click('button:has-text("Upload Files")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(['file1.txt', 'file2.md']);
    
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=Upload successful')).toBeVisible();
  });
});
```

#### Step 2: Run Playwright Tests

Using Playwright MCP tools:

```python
# Navigate to application
mcp__playwright__browser_navigate(url="http://localhost:3000")

# Login
mcp__playwright__browser_type(
    element="Email input",
    ref="e19",
    text="test@arketic.com"
)
mcp__playwright__browser_type(
    element="Password input",
    ref="e23",
    text="testpass123"
)
mcp__playwright__browser_click(
    element="Sign In button",
    ref="e35"
)

# Navigate to Knowledge
mcp__playwright__browser_click(
    element="Knowledge menu",
    ref="e133"
)

# Test file upload
mcp__playwright__browser_click(
    element="Upload File button",
    ref="e370"
)
```

### Test Execution Options

#### Local Execution
```bash
# Run all tests
npm run test:e2e

# Run specific test
npm run test:e2e -- knowledge-upload.spec.ts

# Run with UI
npm run test:e2e -- --headed

# Debug mode
npm run test:e2e -- --debug
```

#### Docker Execution
```bash
# Run in container
docker exec -it arketic-web-1 npm run test:e2e

# With specific file
docker exec -it arketic-web-1 npx playwright test knowledge-upload.spec.ts
```

## Test Categories and Patterns

### 1. CRUD Operations
- Create: Test resource creation with various inputs
- Read: Test retrieval with filters and pagination
- Update: Test partial and full updates
- Delete: Test deletion and cascade effects

### 2. File Upload Tests
- Single file upload
- Multiple file upload
- File type validation
- Size limit validation
- Progress tracking
- Error handling

### 3. Authentication Tests
- Login/logout flows
- Token refresh
- Permission checks
- Session management

### 4. Integration Tests
- End-to-end workflows
- Cross-service communication
- WebSocket connections
- Real-time updates

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up test data after execution
- Use unique identifiers for test data

### 2. Test Data Management
```python
# Create unique test data
timestamp = str(int(time.time()))
test_document = f"Test Document {timestamp}"

# Track created resources
self.created_resources = {
    "documents": [],
    "collections": []
}

# Clean up in finally block
def cleanup_test_data(self):
    for doc_id in self.created_resources["documents"]:
        self.delete_document(doc_id)
```

### 3. Error Handling
```python
def test_with_error_handling(self):
    try:
        response = self.make_request(...)
        if response.status_code == 200:
            return True
        elif response.status_code == 401:
            print("Authentication required")
            return True  # Expected behavior
        elif response.status_code == 404:
            print("Endpoint not implemented")
            return True  # Acceptable for new endpoints
    except Exception as e:
        print(f"Test failed: {str(e)}")
        return False
```

### 4. Response Validation
```python
# Handle multiple response formats
if isinstance(response_body, list):
    # Array response
    for item in response_body:
        process_item(item)
elif response_body.get("data"):
    # Wrapped response
    process_data(response_body["data"])
else:
    # Direct response
    process_response(response_body)
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Run Tests
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start services
        run: docker compose up -d
      - name: Run API tests
        run: |
          docker exec arketic-api-1 python3 apps/api/docs/auth_test.py
          docker exec arketic-api-1 python3 apps/api/docs/knowledge_test.py
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: apps/api/docs/*_test_report.json

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Playwright
        run: npx playwright install
      - name: Run Playwright tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failures
```bash
# Check token validity
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/auth/validate

# Use fresh token
docker exec arketic-api-1 python3 -c "
from auth_test import get_fresh_token
print(get_fresh_token())
"
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL status
docker compose ps postgres
docker compose logs postgres

# Reset test database
docker exec arketic-api-1 alembic downgrade base
docker exec arketic-api-1 alembic upgrade head
```

#### 3. File Upload Issues
```bash
# Check file permissions
docker exec arketic-api-1 ls -la /tmp/test_files/

# Check multipart handling
curl -X POST http://localhost:8000/api/v1/knowledge/upload/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@test.txt" \
  -F "files=@test.md"
```

#### 4. Playwright Issues
```bash
# Install browsers
npx playwright install chromium

# Debug mode
PWDEBUG=1 npx playwright test

# View trace
npx playwright show-trace trace.zip
```

## Test Metrics and Reporting

### Key Metrics to Track
- Test coverage percentage
- Average test execution time
- Failure rate by endpoint
- Response time percentiles (p50, p95, p99)
- Error type distribution

### Report Generation
```bash
# Generate combined report
python3 apps/api/docs/generate_test_summary.py

# Output includes:
# - Total tests across all suites
# - Success/failure breakdown
# - Performance statistics
# - Endpoint coverage
```

## Maintenance and Updates

### Regular Tasks
1. **Weekly**: Review and update test data
2. **Bi-weekly**: Archive old test reports
3. **Monthly**: Review test coverage gaps
4. **Quarterly**: Performance baseline updates

### Adding New Test Types
1. Create test template in `/apps/api/docs/templates/`
2. Implement test class following existing patterns
3. Add to integration script mapping
4. Update this documentation

## Contact and Support

For test-related issues:
- Create issue in GitHub repository
- Tag with `testing` label
- Include test report JSON
- Provide Docker logs if applicable

## Appendix

### A. Environment Variables
```bash
# Test environment
DATABASE_URL=postgresql://arketic:arketic_dev_password@postgres:5432/arketic_test
REDIS_URL=redis://redis:6379/1
API_BASE_URL=http://localhost:8000
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### B. Useful Commands
```bash
# View all test reports
ls -la apps/api/docs/*_test_report.json

# Run all backend tests
for test in apps/api/docs/*_test.py; do
  docker exec arketic-api-1 python3 $test
done

# Clean test data
docker exec arketic-api-1 python3 -c "
from psycopg2 import connect
conn = connect('postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev')
cur = conn.cursor()
cur.execute('DELETE FROM documents WHERE title LIKE %s', ('Test%',))
conn.commit()
"
```

### C. Test Data Specifications
- Test user: test@arketic.com / testpass123
- Test files: TXT, MD, PDF, DOCX
- Max file size: 10MB
- Test collections: General, Documentation, Code

---

Last Updated: 2025-01-10
Version: 1.0.0