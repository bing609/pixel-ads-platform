/**
 * Input Validation Utilities
 * Validates user input and prevents common attacks
 */

import { ValidationError } from './errorHandler.js';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: 8+ characters, uppercase, lowercase, number
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate MIME type
 * @param {string} mimeType - MIME type to validate
 * @param {string[]} allowedTypes - List of allowed MIME types
 * @returns {boolean} True if MIME type is allowed
 */
export const validateMimeType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if file size is valid
 */
export const validateFileSize = (fileSize, maxSize) => {
  return fileSize <= maxSize;
};

/**
 * Validate magic number (file signature)
 * Prevents uploading files with spoofed extensions
 * @param {Buffer} buffer - File buffer
 * @param {string} expectedType - Expected file type (jpg, png, webp)
 * @returns {boolean} True if magic number matches
 */
export const validateMagicNumber = (buffer, expectedType) => {
  // JPEG: FF D8 FF
  if (expectedType === 'jpg' && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }
  // PNG: 89 50 4E 47
  if (expectedType === 'png' && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  // WebP: RIFF ... WEBP
  if (expectedType === 'webp' && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return true;
  }
  return false;
};

/**
 * Sanitize user input
 * Removes potential XSS vectors
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Normalize email (lowercase and trim)
 * @param {string} email - Email to normalize
 * @returns {string} Normalized email
 */
export const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

/**
 * Validation error handler wrapper
 * @param {object} errors - Validation errors object
 * @throws {ValidationError} If validation fails
 */
export const throwValidationError = (errors) => {
  const messages = Object.values(errors).flat();
  throw new ValidationError(messages[0] || 'Validation failed');
};
