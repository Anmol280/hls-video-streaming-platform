const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const database = require('../../../../shared/libs/database');
const redis = require('../../../../shared/libs/redis');
const logger = require('../../../../shared/libs/logger');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Last name must be 1-50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Helper function to validate request
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// POST /api/auth/register
router.post('/register', authLimiter, registerValidation, validateRequest, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    const existingUser = await database.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists with this email or username'
      });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const result = await database.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, first_name, last_name, role, is_verified, created_at
    `, [username, email, hashedPassword, firstName || null, lastName || null, 'user', false]);
    
    const user = result.rows[0];
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Store refresh token in Redis
    await redis.setex(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);
    
    logger.info('User registered successfully', { userId: user.id, email });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const result = await database.query(`
      SELECT id, username, email, password_hash, first_name, last_name, role, 
             is_verified, is_active, last_login_at
      FROM users 
      WHERE email = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is suspended' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Store refresh token in Redis
    await redis.setex(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);
    
    // Update last login
    await database.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    
    logger.info('User logged in successfully', { userId: user.id, email });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        lastLoginAt: user.last_login_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Check if token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    
    // Store new refresh token
    await redis.setex(`refresh_token:${decoded.userId}`, 7 * 24 * 60 * 60, newRefreshToken);
    
    res.json({
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        // Remove refresh token from Redis
        await redis.del(`refresh_token:${decoded.userId}`);
      } catch (error) {
        // Token might be invalid, but we still want to logout
        logger.warn('Invalid refresh token during logout:', error.message);
      }
    }
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validateRequest, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const result = await database.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    const userId = result.rows[0].id;
    
    // Generate reset token
    const resetToken = jwt.sign(
      { userId, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store reset token in Redis with 1 hour expiry
    await redis.setex(`password_reset:${userId}`, 60 * 60, resetToken);
    
    // In a real application, you would send this via email
    logger.info('Password reset requested', { userId, email });
    
    // TODO: Send email with reset token
    // await emailService.sendPasswordReset(email, resetToken);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
    
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, resetPasswordValidation, validateRequest, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    // Check if token exists in Redis
    const storedToken = await redis.get(`password_reset:${decoded.userId}`);
    if (storedToken !== token) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(password);
    
    // Update password
    await database.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, decoded.userId]
    );
    
    // Remove reset token
    await redis.del(`password_reset:${decoded.userId}`);
    
    // Invalidate all refresh tokens for this user
    await redis.del(`refresh_token:${decoded.userId}`);
    
    logger.info('Password reset successfully', { userId: decoded.userId });
    
    res.json({ message: 'Password reset successfully' });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }
    
    // Verify email verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    // Update user verification status
    const result = await database.query(
      'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING email',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('Email verified successfully', { userId: decoded.userId });
    
    res.json({ message: 'Email verified successfully' });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists and is not already verified
    const result = await database.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: 'If the email exists and is unverified, a verification link has been sent' });
    }
    
    const user = result.rows[0];
    
    if (user.is_verified) {
      return res.json({ message: 'Email is already verified' });
    }
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.id, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // TODO: Send email with verification token
    // await emailService.sendEmailVerification(email, verificationToken);
    
    logger.info('Email verification resent', { userId: user.id, email });
    
    res.json({ message: 'If the email exists and is unverified, a verification link has been sent' });
    
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
