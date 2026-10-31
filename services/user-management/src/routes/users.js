const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const sharp = require('sharp');
const database = require('../../../../shared/libs/database');
const redis = require('../../../../shared/libs/redis');
const logger = require('../../../../shared/libs/logger');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for avatar uploads
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation rules
const updateProfileValidation = [
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
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Bio must be less than 500 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .withMessage('Location must be less than 100 characters'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

const updateRoleValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('role')
    .isIn(['user', 'creator', 'moderator', 'admin'])
    .withMessage('Invalid role'),
];

const getUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .withMessage('Search query must be less than 100 characters'),
  query('role')
    .optional()
    .isIn(['user', 'creator', 'moderator', 'admin'])
    .withMessage('Invalid role filter'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'verified', 'unverified'])
    .withMessage('Invalid status filter'),
];

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

// GET /api/users/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(`
      SELECT id, username, email, first_name, last_name, bio, website, location,
             avatar_url, role, is_verified, is_active, created_at, updated_at, last_login_at,
             (SELECT COUNT(*) FROM videos WHERE user_id = users.id) as video_count,
             (SELECT COUNT(*) FROM video_analytics WHERE user_id = users.id AND event_type = 'view') as view_count
      FROM users 
      WHERE id = $1
    `, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        website: user.website,
        location: user.location,
        avatarUrl: user.avatar_url,
        role: user.role,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
        stats: {
          videoCount: parseInt(user.video_count),
          viewCount: parseInt(user.view_count)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authenticateToken, updateProfileValidation, validateRequest, async (req, res) => {
  try {
    const { firstName, lastName, bio, website, location } = req.body;
    const userId = req.user.userId;
    
    const result = await database.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, bio = $3, website = $4, location = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, username, email, first_name, last_name, bio, website, location, 
                avatar_url, role, is_verified, updated_at
    `, [firstName, lastName, bio, website, location, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    logger.info('Profile updated successfully', { userId });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        website: user.website,
        location: user.location,
        avatarUrl: user.avatar_url,
        role: user.role,
        isVerified: user.is_verified,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/avatar - Upload user avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const userId = req.user.userId;
    
    // Process image with sharp
    const processedImage = await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // In a real application, you would upload this to S3 or another storage service
    // For now, we'll save it as base64 in the database (not recommended for production)
    const avatarData = `data:image/jpeg;base64,${processedImage.toString('base64')}`;
    
    const result = await database.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url',
      [avatarData, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('Avatar uploaded successfully', { userId });
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: result.rows[0].avatar_url
    });
    
  } catch (error) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/avatar - Remove user avatar
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await database.query(
      'UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );
    
    logger.info('Avatar removed successfully', { userId });
    
    res.json({ message: 'Avatar removed successfully' });
    
  } catch (error) {
    logger.error('Remove avatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/password - Change password
router.put('/password', authenticateToken, changePasswordValidation, validateRequest, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    // Get current password hash
    const result = await database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await database.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );
    
    // Invalidate all refresh tokens for this user
    await redis.del(`refresh_token:${userId}`);
    
    logger.info('Password changed successfully', { userId });
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:userId - Get user by ID (public profile)
router.get('/:userId', param('userId').isUUID().withMessage('Invalid user ID'), validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await database.query(`
      SELECT id, username, first_name, last_name, bio, website, location,
             avatar_url, role, is_verified, created_at,
             (SELECT COUNT(*) FROM videos WHERE user_id = users.id AND status = 'ready') as video_count,
             (SELECT COUNT(*) FROM video_analytics v JOIN videos vid ON v.video_id = vid.id WHERE vid.user_id = users.id AND v.event_type = 'view') as total_views
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        website: user.website,
        location: user.location,
        avatarUrl: user.avatar_url,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        stats: {
          videoCount: parseInt(user.video_count),
          totalViews: parseInt(user.total_views)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users - Get users list (admin only)
router.get('/', authenticateToken, authorizeRoles(['admin', 'moderator']), getUsersValidation, validateRequest, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const roleFilter = req.query.role;
    const statusFilter = req.query.status;
    
    let whereConditions = [];
    let queryParams = [limit, offset];
    let paramIndex = 3;
    
    // Build WHERE conditions
    if (search) {
      whereConditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (roleFilter) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(roleFilter);
      paramIndex++;
    }
    
    if (statusFilter) {
      switch (statusFilter) {
        case 'active':
          whereConditions.push('is_active = true');
          break;
        case 'inactive':
          whereConditions.push('is_active = false');
          break;
        case 'verified':
          whereConditions.push('is_verified = true');
          break;
        case 'unverified':
          whereConditions.push('is_verified = false');
          break;
      }
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get users
    const usersQuery = `
      SELECT id, username, email, first_name, last_name, role, is_verified, is_active,
             created_at, updated_at, last_login_at,
             (SELECT COUNT(*) FROM videos WHERE user_id = users.id) as video_count
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const usersResult = await database.query(usersQuery, queryParams);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users 
      ${whereClause}
    `;
    
    const countResult = await database.query(countQuery, queryParams.slice(2));
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      users: usersResult.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
        videoCount: parseInt(user.video_count)
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    logger.error('Get users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:userId/role - Update user role (admin only)
router.put('/:userId/role', authenticateToken, authorizeRoles(['admin']), updateRoleValidation, validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Prevent admin from changing their own role
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    const result = await database.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING username, role',
      [role, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    logger.info('User role updated', { userId, newRole: role, updatedBy: req.user.userId });
    
    res.json({
      message: 'User role updated successfully',
      user: {
        id: userId,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:userId/status - Update user status (admin/moderator only)
router.put('/:userId/status', authenticateToken, authorizeRoles(['admin', 'moderator']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    // Prevent admin from deactivating their own account
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }
    
    const result = await database.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING username, is_active',
      [isActive, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // If deactivating user, invalidate their tokens
    if (!isActive) {
      await redis.del(`refresh_token:${userId}`);
    }
    
    logger.info('User status updated', { userId, isActive, updatedBy: req.user.userId });
    
    res.json({
      message: 'User status updated successfully',
      user: {
        id: userId,
        username: user.username,
        isActive: user.is_active
      }
    });
    
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/account - Delete current user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }
    
    // Verify password
    const result = await database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    
    // Start transaction
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete user's videos and related data
      await client.query('DELETE FROM video_analytics WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM video_likes WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM video_comments WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM playlists WHERE user_id = $1', [userId]);
      
      // Delete videos created by user
      const videosResult = await client.query('SELECT id FROM videos WHERE user_id = $1', [userId]);
      const videoIds = videosResult.rows.map(row => row.id);
      
      if (videoIds.length > 0) {
        await client.query('DELETE FROM video_transcodes WHERE video_id = ANY($1)', [videoIds]);
        await client.query('DELETE FROM thumbnails WHERE video_id = ANY($1)', [videoIds]);
        await client.query('DELETE FROM videos WHERE user_id = $1', [userId]);
      }
      
      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      
      // Clean up Redis
      await redis.del(`refresh_token:${userId}`);
      
      logger.info('User account deleted', { userId });
      
      res.json({ message: 'Account deleted successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/stats - Get user statistics (admin only)
router.get('/admin/stats', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
        COUNT(*) FILTER (WHERE role = 'creator') as creators,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '7 days') as active_users_week
      FROM users
    `);
    
    const stats = result.rows[0];
    
    res.json({
      stats: {
        totalUsers: parseInt(stats.total_users),
        activeUsers: parseInt(stats.active_users),
        verifiedUsers: parseInt(stats.verified_users),
        creators: parseInt(stats.creators),
        newUsersThisMonth: parseInt(stats.new_users_month),
        activeUsersThisWeek: parseInt(stats.active_users_week)
      }
    });
    
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
