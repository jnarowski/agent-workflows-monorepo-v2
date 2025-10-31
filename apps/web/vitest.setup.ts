import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';

expect.extend(matchers);
