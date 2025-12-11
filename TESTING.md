# Testing Guide

## Test Suite Overview

This project uses **Vitest** for unit and integration testing. All tests are located in the `__tests__` directory.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run
```

## Test Structure

### Unit Tests
- `__tests__/lib/` - Library function tests
- `__tests__/utils/` - Utility function tests

### API Route Tests
- `__tests__/api/` - API endpoint tests with mocked dependencies

## Test Coverage

### Current Test Coverage

✅ **Prisma Client** - Model structure validation
✅ **Invitation Tokens** - Token generation and uniqueness
✅ **Invitations API** - Validation and error handling
✅ **Events API** - Event creation validation
✅ **RSVP API** - Authentication, validation, and RSVP creation

### Test Patterns

All API route tests follow this pattern:
1. Mock Supabase authentication
2. Mock Prisma database calls
3. Test request validation
4. Test authorization checks
5. Test successful operations

## Adding New Tests

When adding new features, create corresponding tests:

1. Create test file: `__tests__/api/[feature].test.ts`
2. Mock dependencies using `vi.mock()`
3. Use `vi.hoisted()` for mocks that need to be available before `vi.mock()` calls
4. Test both success and error cases
5. Ensure tests are isolated (use `beforeEach` to reset mocks)

## Example Test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: mockPrisma,
}));

describe("Feature API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate input", async () => {
    // Test implementation
  });
});
```

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (recommended)
- CI/CD pipeline
- Before deployments

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (database, APIs)
3. **Coverage**: Aim for >80% code coverage
4. **Naming**: Use descriptive test names
5. **Speed**: Keep tests fast (<100ms each)





