// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Ensure Redis is disabled for tests unless explicitly enabled in env
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED || 'false';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(30000);

// Mock Puppeteer for tests
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      setViewport: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      close: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(undefined)
    }),
    close: jest.fn()
  })
}));

// Mock EJS
jest.mock('ejs', () => ({
  renderFile: jest.fn().mockResolvedValue('<html><body>Mock HTML</body></html>')
}));

export {};
