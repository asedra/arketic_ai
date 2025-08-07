# Arketic Platform Testing Framework

This directory contains the comprehensive testing framework for the Arketic platform, designed to ensure reliability, performance, and maintainability.

## 🏗️ Framework Structure

```
tests/
├── README.md                      # This file
├── api/
│   ├── test-server.ts            # MSW test server configuration
│   ├── mock-handlers.ts          # API mock handlers
│   └── *.test.ts                 # API integration tests
├── fixtures/
│   ├── factories.ts              # Test data factories
│   └── test-setup.ts             # Test environment setup
├── integration/
│   └── *.test.tsx                # Multi-component workflow tests
├── performance/
│   ├── performance-utils.ts      # Performance testing utilities
│   └── *.test.tsx                # Performance benchmark tests
└── utils/
    └── test-utils.tsx            # Common testing utilities and helpers
```

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:performance   # Performance tests only
npm run test:e2e          # End-to-end tests only

# Development workflows
npm run test:watch         # Watch mode for active development
npm run test:changed       # Only test changed files
npm run test:coverage      # Generate coverage report
```

### Writing Your First Test

```typescript
import React from 'react'
import { testUtils } from '../utils/test-utils'
import { PersonFactory } from '../fixtures/factories'
import MyComponent from '../../components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly with test data', () => {
    const mockPerson = PersonFactory.build()
    
    testUtils.render(<MyComponent person={mockPerson} />)
    
    expect(testUtils.screen.getByText(mockPerson.name)).toBeInTheDocument()
  })
})
```

## 🧪 Testing Utilities

### Test Utils (`tests/utils/test-utils.tsx`)

Comprehensive utilities for common testing patterns:

```typescript
import { testUtils } from '../utils/test-utils'

// Rendering with providers
testUtils.render(<Component />)

// User interactions
await testUtils.user.click(button)
await testUtils.user.type(input, 'text')

// Form testing
await testUtils.form.fillAndSubmit({ name: 'John' }, 'Save')
testUtils.form.expectFieldError('email', 'Required field')

// Table testing
testUtils.table.expectRowCount(5)
await testUtils.table.sortByColumn('Name')

// Modal testing
testUtils.modal.expectOpen('Add User')
await testUtils.modal.close()

// Async utilities
await testUtils.async.waitFor(() => {
  expect(element).toBeInTheDocument()
})
```

### Data Factories (`tests/fixtures/factories.ts`)

Generate realistic test data:

```typescript
import { PersonFactory, ComplianceFactory } from '../fixtures/factories'

// Generate single item
const person = PersonFactory.build()
const compliance = ComplianceFactory.buildCompliant()

// Generate multiple items
const people = PersonFactory.buildMany(10)

// Generate with specific attributes
const manager = PersonFactory.buildManager({ department: 'Engineering' })

// Generate related data
const { people, compliance, documents } = FactoryUtils.createRelatedData()
```

### API Mocking (`tests/api/test-server.ts`)

Mock API responses for testing:

```typescript
import { server } from '../api/test-server'
import { http, HttpResponse } from 'msw'

// Override default handlers in tests
server.use(
  http.get('/api/users', () => {
    return HttpResponse.json({ data: [] })
  })
)

// Simulate errors
server.use(
  http.post('/api/users', () => {
    return HttpResponse.json(
      { error: 'Validation failed' },
      { status: 400 }
    )
  })
)
```

## 📊 Performance Testing

### Basic Performance Tests

```typescript
import { performanceUtils } from '../performance/performance-utils'

describe('Component Performance', () => {
  it('renders quickly', async () => {
    await performanceUtils.expectFastRender(<Component />, 100) // 100ms max
  })

  it('handles large datasets efficiently', async () => {
    const largeData = Array.from({ length: 1000 }, () => dataFactory())
    const component = <Table data={largeData} />
    
    const renderTime = await performanceUtils.measureRenderTime(component)
    expect(renderTime).toBeLessThan(500) // 500ms max
  })
})
```

### Comprehensive Performance Analysis

```typescript
// Stress testing
const stressResult = await performanceUtils.stressTest(component, {
  iterations: 100,
  concurrency: 4
})

expect(stressResult.memoryLeak).toBe(false)
expect(stressResult.performanceDegradation).toBe(false)

// Benchmarking
const results = await performanceUtils.benchmark([
  { name: 'Version A', component: <ComponentA /> },
  { name: 'Version B', component: <ComponentB /> }
])

// Regression testing
const regression = await performanceUtils.regressionTest(
  oldComponent,
  newComponent,
  20 // Max 20% regression allowed
)

expect(regression.passed).toBe(true)
```

## 🔧 Integration Testing

Test complex workflows across multiple components:

```typescript
describe('User Management Workflow', () => {
  it('completes full user lifecycle', async () => {
    // 1. Load user list
    testUtils.render(<UserManagement />)
    await testUtils.async.waitFor(() => {
      expect(testUtils.screen.getByText('Users')).toBeInTheDocument()
    })

    // 2. Add new user
    await testUtils.user.click(testUtils.screen.getByText('Add User'))
    await testUtils.form.fillAndSubmit({
      name: 'John Doe',
      email: 'john@example.com'
    })

    // 3. Verify user appears in list
    await testUtils.async.waitFor(() => {
      expect(testUtils.screen.getByText('John Doe')).toBeInTheDocument()
    })

    // 4. Edit user
    const editButton = testUtils.screen.getByRole('button', { name: /edit.*john/i })
    await testUtils.user.click(editButton)
    
    // 5. Verify changes persist
    // ... additional workflow steps
  })
})
```

## 🎯 Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests isolated** - each test should be independent

### Test Data

1. **Use factories** for consistent test data generation
2. **Create realistic data** that mirrors production scenarios
3. **Use specific test data** when testing edge cases
4. **Reset data state** between tests

### Component Testing

```typescript
describe('UserCard Component', () => {
  describe('Rendering', () => {
    it('displays user information correctly', () => {
      // Test basic rendering
    })

    it('shows placeholder when user data is missing', () => {
      // Test edge cases
    })
  })

  describe('Interactions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      // Test user interactions
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      // Test accessibility
    })
  })
})
```

### Performance Testing

1. **Establish baselines** for acceptable performance
2. **Test with realistic data volumes**
3. **Monitor memory usage** in long-running tests
4. **Use performance budgets** to prevent regressions

### Error Handling

1. **Test error states** explicitly
2. **Mock API failures** to test error boundaries
3. **Verify error messages** are user-friendly
4. **Test recovery scenarios**

## 📈 Coverage and Quality

### Coverage Requirements

- **Global**: 80% statements, 75% branches, 80% functions
- **Critical components**: 90% statements, 85% branches, 90% functions

### Quality Gates

All tests must pass these checks:
- ✅ No test failures
- ✅ Coverage thresholds met
- ✅ Performance benchmarks passed
- ✅ No accessibility violations
- ✅ Security audit clean

## 🔄 CI/CD Integration

The testing framework integrates with GitHub Actions:

- **Pull Requests**: Run unit, integration, and basic E2E tests
- **Main Branch**: Full test suite including performance audits
- **Nightly**: Comprehensive testing with detailed reports
- **Release**: Complete validation including security scans

## 🛠️ Debugging Tests

### Running Tests in Debug Mode

```bash
# Debug specific test
npm run test:debug -- MyComponent.test.tsx

# Run with verbose output
npm run test:verbose

# Update snapshots
npm run test:update-snapshots
```

### Common Issues

1. **Test timeouts**: Increase timeout for async operations
2. **Flaky tests**: Use `waitFor` instead of fixed delays
3. **Memory leaks**: Clean up event listeners and timers
4. **Mock issues**: Reset mocks between tests

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Playwright E2E Testing](https://playwright.dev/)

## 🤝 Contributing

When adding new tests:

1. Follow existing patterns and conventions
2. Add appropriate test types (unit, integration, E2E)
3. Include performance tests for complex components
4. Update documentation when introducing new patterns
5. Ensure all quality gates pass

For questions or suggestions, please reach out to the development team or open an issue in the repository.