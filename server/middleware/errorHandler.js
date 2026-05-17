/**
 * Global Error Handler Middleware
 * Standardizes error responses across all endpoints
 * Prevents sensitive information leakage
 */

// Custom Error Classes
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Global Error Handler
 * Catches all errors and returns standardized JSON response
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // AppError instances (expected errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.constructor.name,
      timestamp: err.timestamp
    });
  }

  // Database errors
  if (err.code === 'FOREIGN_KEY_VIOLATION') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference to another resource',
      errorCode: 'FOREIGN_KEY_VIOLATION',
      timestamp: new Date().toISOString()
    });
  }

  // Validation errors (from pg-promise)
  if (err.code === 'UNIQUE_VIOLATION') {
    return res.status(409).json({
      success: false,
      message: 'This resource already exists',
      errorCode: 'UNIQUE_VIOLATION',
      timestamp: new Date().toISOString()
    });
  }

  // Default error (server error)
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
    errorCode: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { stack: err.stack })
  });
};
