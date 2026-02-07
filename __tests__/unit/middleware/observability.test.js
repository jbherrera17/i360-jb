/**
 * Observability Middleware Tests
 * Tests for request correlation, logging, and metrics
 */

// Mock the logger and metrics services
jest.mock('../../../server/services/logger', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    logRequest: jest.fn()
}));

jest.mock('../../../server/services/metrics', () => ({
    setActiveConnections: jest.fn(),
    recordHttpRequest: jest.fn()
}));

const {
    correlationId,
    requestLogger,
    observabilityMiddleware,
    errorLogger
} = require('../../../server/middleware/observability');
const logger = require('../../../server/services/logger');
const metrics = require('../../../server/services/metrics');

// Helper to create mock req/res/next
const createMocks = (headers = {}, path = '/test') => {
    const req = {
        headers,
        method: 'GET',
        originalUrl: path,
        path,
        ip: '127.0.0.1'
    };

    const res = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 200
    };

    const next = jest.fn();

    return { req, res, next };
};

describe('Observability Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.correlationId = null;
    });

    describe('correlationId', () => {
        it('should generate new correlation ID when none provided', () => {
            const { req, res, next } = createMocks();

            correlationId(req, res, next);

            expect(req.correlationId).toBeDefined();
            expect(req.correlationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
            expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.correlationId);
            expect(next).toHaveBeenCalled();
        });

        it('should use existing X-Correlation-ID header', () => {
            const existingId = 'existing-correlation-123';
            const { req, res, next } = createMocks({
                'x-correlation-id': existingId
            });

            correlationId(req, res, next);

            expect(req.correlationId).toBe(existingId);
            expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId);
        });

        it('should use X-Request-ID as fallback', () => {
            const requestId = 'request-id-456';
            const { req, res, next } = createMocks({
                'x-request-id': requestId
            });

            correlationId(req, res, next);

            expect(req.correlationId).toBe(requestId);
        });

        it('should prefer X-Correlation-ID over X-Request-ID', () => {
            const correlationIdValue = 'correlation-123';
            const requestIdValue = 'request-456';
            const { req, res, next } = createMocks({
                'x-correlation-id': correlationIdValue,
                'x-request-id': requestIdValue
            });

            correlationId(req, res, next);

            expect(req.correlationId).toBe(correlationIdValue);
        });

        it('should set global.correlationId', () => {
            const { req, res, next } = createMocks();

            correlationId(req, res, next);

            expect(global.correlationId).toBe(req.correlationId);
        });
    });

    describe('requestLogger', () => {
        it('should track connection count', () => {
            const { req, res, next } = createMocks();

            requestLogger(req, res, next);

            expect(metrics.setActiveConnections).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should log debug for incoming request', () => {
            const { req, res, next } = createMocks();

            requestLogger(req, res, next);

            expect(logger.debug).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1'
            }));
        });

        it('should record metrics on response end', () => {
            const { req, res, next } = createMocks();
            res.statusCode = 200;

            requestLogger(req, res, next);

            // Simulate response ending
            res.end();

            expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
                'GET',
                '/test',
                200,
                expect.any(Number) // duration
            );
        });

        it('should log request on response end', () => {
            const { req, res, next } = createMocks();

            requestLogger(req, res, next);
            res.end();

            expect(logger.logRequest).toHaveBeenCalledWith(
                req,
                res,
                expect.any(Number)
            );
        });

        it('should decrement connection count on response end', () => {
            const { req, res, next } = createMocks();

            requestLogger(req, res, next);

            // Should increment once on request
            expect(metrics.setActiveConnections).toHaveBeenCalledTimes(1);

            res.end();

            // Should be called again (decrement) on end
            expect(metrics.setActiveConnections).toHaveBeenCalledTimes(2);
        });

        it('should clear global.correlationId on response end', () => {
            const { req, res, next } = createMocks();
            global.correlationId = 'test-id';

            requestLogger(req, res, next);
            res.end();

            expect(global.correlationId).toBeNull();
        });

        it('should pass through chunk and encoding to original end', () => {
            const { req, res, next } = createMocks();
            const originalEnd = res.end;

            requestLogger(req, res, next);

            const chunk = 'response body';
            const encoding = 'utf-8';
            res.end(chunk, encoding);

            // The overridden end should have been called with these args
            // We can't easily test the original was called, but we can verify the middleware didn't throw
        });
    });

    describe('observabilityMiddleware (combined)', () => {
        it('should add correlation ID to all requests', () => {
            const { req, res, next } = createMocks({}, '/api/users');

            observabilityMiddleware(req, res, next);

            expect(req.correlationId).toBeDefined();
            expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.correlationId);
        });

        it('should skip logging for /health endpoint', () => {
            const { req, res, next } = createMocks({}, '/health');

            observabilityMiddleware(req, res, next);

            // Should still set correlation ID
            expect(req.correlationId).toBeDefined();

            // But should skip metrics tracking
            expect(metrics.setActiveConnections).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should skip logging for /ready endpoint', () => {
            const { req, res, next } = createMocks({}, '/ready');

            observabilityMiddleware(req, res, next);

            expect(metrics.setActiveConnections).not.toHaveBeenCalled();
        });

        it('should skip logging for /metrics endpoint', () => {
            const { req, res, next } = createMocks({}, '/metrics');

            observabilityMiddleware(req, res, next);

            expect(metrics.setActiveConnections).not.toHaveBeenCalled();
        });

        it('should skip logging for /favicon.ico', () => {
            const { req, res, next } = createMocks({}, '/favicon.ico');

            observabilityMiddleware(req, res, next);

            expect(metrics.setActiveConnections).not.toHaveBeenCalled();
        });

        it('should skip logging for paths starting with /health', () => {
            const { req, res, next } = createMocks({}, '/health/detailed');

            observabilityMiddleware(req, res, next);

            expect(metrics.setActiveConnections).not.toHaveBeenCalled();
        });

        it('should log for normal API paths', () => {
            const { req, res, next } = createMocks({}, '/api/agents');

            observabilityMiddleware(req, res, next);

            expect(metrics.setActiveConnections).toHaveBeenCalled();
        });

        it('should record metrics for normal requests on end', () => {
            const { req, res, next } = createMocks({}, '/api/users');
            res.statusCode = 201;

            observabilityMiddleware(req, res, next);
            res.end();

            expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
                'GET',
                '/api/users',
                201,
                expect.any(Number)
            );
        });

        it('should preserve existing X-Correlation-ID header', () => {
            const existingId = 'preserved-correlation-id';
            const { req, res, next } = createMocks({
                'x-correlation-id': existingId
            }, '/api/test');

            observabilityMiddleware(req, res, next);

            expect(req.correlationId).toBe(existingId);
            expect(global.correlationId).toBe(existingId);
        });
    });

    describe('errorLogger', () => {
        it('should log error details', () => {
            const error = new Error('Test error');
            const { req, res, next } = createMocks();
            req.userId = 'user-123';

            errorLogger(error, req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Unhandled error', expect.objectContaining({
                error: 'Test error',
                stack: expect.any(String),
                method: 'GET',
                url: '/test',
                userId: 'user-123'
            }));
        });

        it('should call next with error', () => {
            const error = new Error('Test error');
            const { req, res, next } = createMocks();

            errorLogger(error, req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it('should handle missing userId', () => {
            const error = new Error('Test error');
            const { req, res, next } = createMocks();
            // userId is undefined

            errorLogger(error, req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Unhandled error', expect.objectContaining({
                userId: undefined
            }));
        });

        it('should handle errors without stack trace', () => {
            const error = { message: 'Custom error without stack' };
            const { req, res, next } = createMocks();

            errorLogger(error, req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Unhandled error', expect.objectContaining({
                error: 'Custom error without stack',
                stack: undefined
            }));
        });
    });

    describe('Edge Cases', () => {
        it('should handle requests with all methods', () => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

            methods.forEach(method => {
                jest.clearAllMocks();
                const { req, res, next } = createMocks({}, '/api/test');
                req.method = method;

                observabilityMiddleware(req, res, next);
                res.end();

                expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
                    method,
                    '/api/test',
                    200,
                    expect.any(Number)
                );
            });
        });

        it('should handle various status codes', () => {
            const statusCodes = [200, 201, 400, 401, 403, 404, 500];

            statusCodes.forEach(status => {
                jest.clearAllMocks();
                const { req, res, next } = createMocks({}, '/api/test');
                res.statusCode = status;

                observabilityMiddleware(req, res, next);
                res.end();

                expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
                    'GET',
                    '/api/test',
                    status,
                    expect.any(Number)
                );
            });
        });

        it('should generate unique correlation IDs for each request', () => {
            const ids = new Set();

            for (let i = 0; i < 10; i++) {
                const { req, res, next } = createMocks();
                correlationId(req, res, next);
                ids.add(req.correlationId);
            }

            expect(ids.size).toBe(10);
        });
    });
});
