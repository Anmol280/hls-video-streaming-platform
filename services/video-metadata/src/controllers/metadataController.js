const metadataService = require('../services/metadataService');
const cacheService = require('../services/cacheService');
const analyticsService = require('../services/analyticsService');
const searchService = require('../services/searchService');
const logger = require('../utils/logger');

class MetadataController {
  async getVideoMetadata(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id;

      // Check cache first
      const cacheKey = `video:metadata:${videoId}`;
      let metadata = await cacheService.get(cacheKey);

      if (!metadata) {
        metadata = await metadataService.getVideoMetadata(videoId, userId);
        if (metadata) {
          await cacheService.set(cacheKey, metadata, 300); // Cache for 5 minutes
        }
      }

      if (!metadata) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json(metadata);
    } catch (error) {
      logger.error('Get video metadata error:', error);
      res.status(500).json({ error: 'Failed to get video metadata' });
    }
  }

  async getPublicMetadata(req, res) {
    try {
      const { videoId } = req.params;

      const cacheKey = `video:public:${videoId}`;
      let metadata = await cacheService.get(cacheKey);

      if (!metadata) {
        metadata = await metadataService.getPublicMetadata(videoId);
        if (metadata) {
          await cacheService.set(cacheKey, metadata, 600); // Cache for 10 minutes
        }
      }

      if (!metadata) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json(metadata);
    } catch (error) {
      logger.error('Get public metadata error:', error);
      res.status(500).json({ error: 'Failed to get video metadata' });
    }
  }

  async createVideoMetadata(req, res) {
    try {
      const videoData = req.body;
      
      const metadata = await metadataService.createVideoMetadata(videoData);
      
      // Invalidate cache
      await cacheService.del(`video:metadata:${metadata.id}`);
      await cacheService.del(`video:public:${metadata.id}`);
      await cacheService.del(`user:videos:${metadata.userId}`);

      res.status(201).json(metadata);
    } catch (error) {
      logger.error('Create video metadata error:', error);
      res.status(500).json({ error: 'Failed to create video metadata' });
    }
  }

  async updateVideoMetadata(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Check ownership
      const video = await metadataService.getVideoMetadata(videoId, userId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.userId !== userId && !req.user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedMetadata = await metadataService.updateVideoMetadata(videoId, updateData);

      // Invalidate cache
      await cacheService.del(`video:metadata:${videoId}`);
      await cacheService.del(`video:public:${videoId}`);
      await cacheService.del(`user:videos:${video.userId}`);

      res.json(updatedMetadata);
    } catch (error) {
      logger.error('Update video metadata error:', error);
      res.status(500).json({ error: 'Failed to update video metadata' });
    }
  }

  async deleteVideoMetadata(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const video = await metadataService.getVideoMetadata(videoId, userId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.userId !== userId && !req.user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await metadataService.deleteVideoMetadata(videoId);

      // Invalidate cache
      await cacheService.del(`video:metadata:${videoId}`);
      await cacheService.del(`video:public:${videoId}`);
      await cacheService.del(`user:videos:${video.userId}`);

      res.json({ message: 'Video metadata deleted successfully' });
    } catch (error) {
      logger.error('Delete video metadata error:', error);
      res.status(500).json({ error: 'Failed to delete video metadata' });
    }
  }

  async getUserVideos(req, res) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const { page = 1, limit = 20, status, visibility, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

      // Check if user can access this data
      if (userId !== requestingUserId && !req.user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const cacheKey = `user:videos:${userId}:${page}:${limit}:${status}:${visibility}:${sortBy}:${sortOrder}`;
      let videos = await cacheService.get(cacheKey);

      if (!videos) {
        videos = await metadataService.getUserVideos(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          visibility,
          sortBy,
          sortOrder
        });
        
        if (videos) {
          await cacheService.set(cacheKey, videos, 300); // Cache for 5 minutes
        }
      }

      res.json(videos);
    } catch (error) {
      logger.error('Get user videos error:', error);
      res.status(500).json({ error: 'Failed to get user videos' });
    }
  }

  async searchVideos(req, res) {
    try {
      const searchParams = req.query;
      const userId = req.user?.id;

      const results = await searchService.searchVideos({
        ...searchParams,
        userId
      });

      res.json(results);
    } catch (error) {
      logger.error('Search videos error:', error);
      res.status(500).json({ error: 'Failed to search videos' });
    }
  }

  async searchPublicVideos(req, res) {
    try {
      const searchParams = req.query;

      const results = await searchService.searchPublicVideos(searchParams);

      res.json(results);
    } catch (error) {
      logger.error('Search public videos error:', error);
      res.status(500).json({ error: 'Failed to search videos' });
    }
  }

  async getTrendingVideos(req, res) {
    try {
      const { timeframe = '24h', limit = 20 } = req.query;

      const cacheKey = `trending:${timeframe}:${limit}`;
      let trendingVideos = await cacheService.get(cacheKey);

      if (!trendingVideos) {
        trendingVideos = await analyticsService.getTrendingVideos(timeframe, parseInt(limit));
        if (trendingVideos) {
          await cacheService.set(cacheKey, trendingVideos, 1800); // Cache for 30 minutes
        }
      }

      res.json(trendingVideos || []);
    } catch (error) {
      logger.error('Get trending videos error:', error);
      res.status(500).json({ error: 'Failed to get trending videos' });
    }
  }

  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20 } = req.query;

      if (userId !== req.user.id && !req.user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const cacheKey = `recommendations:${userId}:${limit}`;
      let recommendations = await cacheService.get(cacheKey);

      if (!recommendations) {
        recommendations = await analyticsService.getRecommendations(userId, parseInt(limit));
        if (recommendations) {
          await cacheService.set(cacheKey, recommendations, 3600); // Cache for 1 hour
        }
      }

      res.json(recommendations || []);
    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  }

  async getVideoAnalytics(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const { timeframe = '7d' } = req.query;

      // Check ownership
      const video = await metadataService.getVideoMetadata(videoId, userId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.userId !== userId && !req.user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const analytics = await analyticsService.getVideoAnalytics(videoId, timeframe);

      res.json(analytics);
    } catch (error) {
      logger.error('Get video analytics error:', error);
      res.status(500).json({ error: 'Failed to get video analytics' });
    }
  }

  async updateVideoStatus(req, res) {
    try {
      const { videoId } = req.params;
      const { status, progress, errorMessage } = req.body;

      await metadataService.updateVideoStatus(videoId, status, progress, errorMessage);

      // Invalidate cache
      await cacheService.del(`video:metadata:${videoId}`);
      await cacheService.del(`video:public:${videoId}`);

      res.json({ message: 'Video status updated successfully' });
    } catch (error) {
      logger.error('Update video status error:', error);
      res.status(500).json({ error: 'Failed to update video status' });
    }
  }

  async recordView(req, res) {
    try {
      const { videoId } = req.params;
      const { userId, sessionId, watchTime, quality } = req.body;

      await analyticsService.recordView(videoId, {
        userId,
        sessionId,
        watchTime,
        quality,
        timestamp: new Date()
      });

      // Update view count in metadata
      await metadataService.incrementViewCount(videoId);

      // Invalidate cache
      await cacheService.del(`video:metadata:${videoId}`);
      await cacheService.del(`video:public:${videoId}`);

      res.json({ message: 'View recorded successfully' });
    } catch (error) {
      logger.error('Record view error:', error);
      res.status(500).json({ error: 'Failed to record view' });
    }
  }

  async recordEngagement(req, res) {
    try {
      const { videoId } = req.params;
      const { userId, type, data } = req.body;

      await analyticsService.recordEngagement(videoId, userId, type, data);

      res.json({ message: 'Engagement recorded successfully' });
    } catch (error) {
      logger.error('Record engagement error:', error);
      res.status(500).json({ error: 'Failed to record engagement' });
    }
  }
}

module.exports = new MetadataController();
