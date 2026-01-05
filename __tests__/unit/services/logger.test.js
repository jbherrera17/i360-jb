/**
 * Logger Service Tests
 * Phase 14: Observability & Monitoring
 */

// Mock winston before requiring logger
jest.mock('winston', () => {
  // winston.format(fn) returns a function that transforms log info
  const mockFormatFn = jest.fn().mockImplementation(() => {
    // Return a function (like the actual custom format)
    return jest.fn().mockReturnValue({});
  });

  // Make format callable as a function AND have properties
  const mockFormat = Object.assign(mockFormatFn, {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    colorize: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({}),
    json: jest.fn().mockReturnValue({}),
    errors: jest.fn().mockReturnValue({}),
  });

  const mockTransports = {
    Console: jest.fn().mockImplementation(() => ({})),
    File: jest.fn().mockImplementation(() => ({})),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
  };

  return {
    format: mockFormat,
    transports: mockTransports,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    addColors: jest.fn(),
  };
});

describe('Logger Service', () => {
  let logger;
  let winston;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;

    winston = require('winston');
    logger = require('../../../server/services/logger');
  });

  describe('initialization', () => {
    it('should create a winston logger', () => {
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should add custom colors', () => {
      expect(winston.addColors).toHaveBeenCalledWith({
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
      });
    });
  });

  describe('log methods', () => {
    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have http method', () => {
      expect(typeof logger.http).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('withContext', () => {
    it('should return logger methods with context', () => {
      const contextLogger = logger.withContext({ service: 'test' });

      expect(typeof contextLogger.error).toBe('function');
      expect(typeof contextLogger.warn).toBe('function');
      expect(typeof contextLogger.info).toBe('function');
      expect(typeof contextLogger.http).toBe('function');
      expect(typeof contextLogger.debug).toBe('function');
    });
  });

  describe('logRequest', () => {
    it('should be a function', () => {
      expect(typeof logger.logRequest).toBe('function');
    });

    it('should log HTTP requests', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        ip: '127.0.0.1',
        userId: 'user-123',
      };
      const res = { statusCode: 200 };

      logger.logRequest(req, res, 50);

      // Should call http for successful requests
      expect(logger.http).toHaveBeenCalled();
    });

    it('should log errors for 5xx responses', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        get: jest.fn(),
        ip: '127.0.0.1',
      };
      const res = { statusCode: 500 };

      logger.logRequest(req, res, 50);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should log warnings for 4xx responses', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        get: jest.fn(),
        ip: '127.0.0.1',
      };
      const res = { statusCode: 404 };

      logger.logRequest(req, res, 50);

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('logLLMCall', () => {
    it('should be a function', () => {
      expect(typeof logger.logLLMCall).toBe('function');
    });

    it('should log successful LLM calls', () => {
      logger.logLLMCall('anthropic', 'claude-sonnet-4', { input: 100, output: 50 }, 1500);

      expect(logger.info).toHaveBeenCalled();
    });

    it('should log LLM errors', () => {
      const error = new Error('API timeout');
      logger.logLLMCall('anthropic', 'claude-sonnet-4', { input: 100, output: 0 }, 5000, error);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('logQuery', () => {
    it('should be a function', () => {
      expect(typeof logger.logQuery).toBe('function');
    });

    it('should log successful queries', () => {
      logger.logQuery('users', 'SELECT', 15);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should log query errors', () => {
      const error = new Error('Connection failed');
      logger.logQuery('users', 'SELECT', 5000, error);

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
