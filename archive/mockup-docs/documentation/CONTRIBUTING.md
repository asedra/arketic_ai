# Contributing to Arketic Platform

Thank you for your interest in contributing to the Arketic Platform! This document provides guidelines and information to help you contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Security](#security)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm 9.0.0 or later (or pnpm 8.0.0+)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/arketic-platform.git
   cd arketic-platform
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

We use a modified Git Flow branching strategy:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features (branch from `develop`)
- **`bugfix/*`**: Bug fixes (branch from `develop` or `main`)
- **`hotfix/*`**: Critical fixes for production (branch from `main`)
- **`release/*`**: Release preparation (branch from `develop`)

### Branch Naming Convention

- `feature/description-of-feature`
- `bugfix/description-of-bug`
- `hotfix/description-of-hotfix`
- `docs/description-of-change`
- `refactor/description-of-refactor`

### Development Process

1. **Pull latest changes**: Always start with the latest code
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**: Follow our coding standards
4. **Test your changes**: Ensure all tests pass
5. **Commit your changes**: Use conventional commits
6. **Push and create PR**: Follow our PR template

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use strict mode configurations

### React

- Use functional components with hooks
- Follow React best practices
- Use proper key props for lists
- Implement proper error boundaries

### Styling

- Use Tailwind CSS for styling
- Follow BEM methodology for custom CSS
- Ensure responsive design
- Test accessibility (a11y)

### File Organization

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   └── feature/        # Feature-specific components
├── pages/              # Next.js pages
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # Global styles
└── tests/              # Test files
```

### Naming Conventions

- **Files**: `kebab-case.tsx`, `PascalCase.tsx` for components
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks
- `security`: Security improvements
- `deps`: Dependency updates

### Examples

```bash
feat(auth): add OAuth2 authentication
fix(ui): resolve button alignment issue
docs: update API documentation
test(api): add integration tests for user endpoints
```

## Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run all checks**:
   ```bash
   npm run lint:strict
   npm run type-check
   npm run test:all
   npm run build
   ```

3. **Update documentation** if needed

### PR Requirements

- Fill out the PR template completely
- Include relevant tests for new features
- Update documentation for user-facing changes
- Ensure all CI checks pass
- Get at least one approvals from maintainers
- Keep PR focused and atomic

### PR Review Process

1. **Automated checks**: All CI checks must pass
2. **Code review**: At least one maintainer review
3. **Testing**: Manual testing if needed
4. **Documentation**: Verify docs are updated
5. **Merge**: Squash and merge to maintain clean history

## Testing

### Test Types

- **Unit tests**: Test individual components/functions
- **Integration tests**: Test component interactions
- **E2E tests**: Test complete user workflows
- **Performance tests**: Test performance metrics
- **Accessibility tests**: Test a11y compliance

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Writing Tests

- Write tests for all new features
- Test edge cases and error conditions
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

## Documentation

### Types of Documentation

- **Code comments**: For complex logic
- **API documentation**: For public APIs
- **User guides**: For end users
- **Developer guides**: For contributors

### Documentation Standards

- Write clear, concise documentation
- Include code examples
- Keep documentation up to date
- Use proper grammar and spelling

## Security

### Security Guidelines

- Never commit secrets or API keys
- Follow OWASP security guidelines
- Validate all user inputs
- Use HTTPS for all communications
- Implement proper authentication/authorization

### Reporting Security Issues

Please report security vulnerabilities privately to [security@arketic.com](mailto:security@arketic.com).

## Code Review Guidelines

### As a Reviewer

- Be constructive and respectful
- Focus on code quality and standards
- Test the changes locally if needed
- Provide specific, actionable feedback
- Approve when satisfied with quality

### As an Author

- Respond to feedback promptly
- Make requested changes
- Ask questions if feedback is unclear
- Test changes after addressing feedback

## Getting Help

- **Documentation**: Check existing docs first
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Chat**: Join our developer chat
- **Email**: Contact maintainers directly

## Recognition

Contributors will be recognized in:
- README.md contributor section
- Release notes for significant contributions
- Annual contributor highlights

Thank you for contributing to the Arketic Platform! 🚀