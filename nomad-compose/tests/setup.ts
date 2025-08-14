// Test setup file
import { jest } from '@jest/globals';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit to prevent tests from exiting
process.exit = jest.fn() as never;

// Mock fs-extra to avoid file system operations in tests
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
  copy: jest.fn(),
}));

// Mock axios to avoid HTTP requests in tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));
