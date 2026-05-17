/**
 * Authentication Routes
 * Register, Login, Logout, Refresh Token
 */

import express from 'express';
import { body } from 'express-validator';
import bcryptjs from 'bcryptjs';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../middleware/auth.js';
import { query, getOne, insert } from '../database/connection.js';
import { handleValidationErrors, validateRegister, validateLogin } from '../middleware/validation.js';
import { AppError, ValidationError, AuthenticationError, ConflictError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register user baru
 */
router.post('/register', validateRegister, handleValidationErrors, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check email already exists
    const existingUser = await getOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      throw new ConflictError('Email sudah terdaftar');
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    const newUser = await insert(
      `INSERT INTO users (name, email, password, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, email, role, created_at`,
      [name, email.toLowerCase(), hashedPassword, 'user']
    );

    // Generate tokens
    const accessToken = generateToken(newUser.id, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    // Set refresh token ke database (opsional, untuk token blacklist/validation)
    await insert(
      `INSERT INTO sessions (user_id, refresh_token, created_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days')`,
      [newUser.id, refreshToken]
    );

    res.status(201).json({
      message: 'User berhasil terdaftar',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login dengan email & password
 */
router.post('/login', validateLogin, handleValidationErrors, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await getOne(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      throw new AuthenticationError('Email atau password salah');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Email atau password salah');
    }

    // Generate tokens
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await insert(
      `INSERT INTO sessions (user_id, refresh_token, created_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token dengan refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token tidak ditemukan');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AuthenticationError('Refresh token tidak valid');
    }

    // Check token in database (untuk blacklist/revocation)
    const session = await getOne(
      'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (!session) {
      throw new AuthenticationError('Refresh token sudah expired atau tidak valid');
    }

    // Get user
    const user = await getOne(
      'SELECT id, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!user) {
      throw new AuthenticationError('User tidak ditemukan');
    }

    // Generate new access token
    const newAccessToken = generateToken(user.id, user.role);

    res.json({
      message: 'Token berhasil di-refresh',
      accessToken: newAccessToken
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout dan revoke refresh token
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete session
      await query(
        'DELETE FROM sessions WHERE refresh_token = $1',
        [refreshToken]
      );
    }

    res.json({
      message: 'Logout berhasil'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset token
 */
router.post('/forgot-password', 
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      // Find user
      const user = await getOne(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (!user) {
        // Jangan reveal apakah email exists atau tidak (security best practice)
        return res.json({
          message: 'Jika email terdaftar, link reset password akan dikirim'
        });
      }

      // Generate reset token
      const resetToken = generateToken(user.id, 'user', '15m');
      
      // Save reset token
      await insert(
        `INSERT INTO password_reset_tokens (user_id, token, created_at, expires_at)
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '15 minutes')`,
        [user.id, resetToken]
      );

      // TODO: Send email dengan reset link
      // Format: https://client-url/reset-password?token=resetToken

      res.json({
        message: 'Jika email terdaftar, link reset password akan dikirim'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password dengan token
 */
router.post('/reset-password',
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;

      // Verify token
      const decoded = verifyRefreshToken(token);
      if (!decoded) {
        throw new AuthenticationError('Token tidak valid');
      }

      // Check token in database
      const resetRecord = await getOne(
        'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
      );

      if (!resetRecord) {
        throw new AuthenticationError('Token tidak valid atau sudah expired');
      }

      // Hash new password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);

      // Update password
      await query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, resetRecord.user_id]
      );

      // Delete used token
      await query(
        'DELETE FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      res.json({
        message: 'Password berhasil di-reset'
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
