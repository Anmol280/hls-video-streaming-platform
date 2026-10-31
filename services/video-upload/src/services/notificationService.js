const axios = require('axios');

class NotificationService {
  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';
  }

  async sendNotification(userId, notificationData) {
    try {
      const response = await axios.post(`${this.notificationServiceUrl}/api/notifications`, {
        userId,
        ...notificationData
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': process.env.SERVICE_AUTH_TOKEN || 'development-token'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Send notification error:', error.message);
      // Don't throw error as notification failure shouldn't break main flow
      return null;
    }
  }

  async sendBulkNotifications(notifications) {
    try {
      const response = await axios.post(`${this.notificationServiceUrl}/api/notifications/bulk`, {
        notifications
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': process.env.SERVICE_AUTH_TOKEN || 'development-token'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Send bulk notifications error:', error.message);
      return null;
    }
  }

  async notifySubscribers(creatorId, videoData) {
    try {
      const response = await axios.post(`${this.notificationServiceUrl}/api/notifications/subscribers`, {
        creatorId,
        type: 'new_video',
        title: 'New Video Published',
        message: `${videoData.creatorName} just published a new video: "${videoData.title}"`,
        data: {
          videoId: videoData.id,
          videoTitle: videoData.title,
          videoThumbnail: videoData.thumbnailUrl,
          creatorId,
          creatorName: videoData.creatorName
        }
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': process.env.SERVICE_AUTH_TOKEN || 'development-token'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Notify subscribers error:', error.message);
      return null;
    }
  }

  async sendVideoProcessingUpdate(userId, videoId, status, progress = 0) {
    const messages = {
      'processing': 'Your video is being processed',
      'transcoding': 'Your video is being transcoded',
      'generating_thumbnails': 'Generating video thumbnails',
      'publishing': 'Publishing your video',
      'completed': 'Your video has been published successfully',
      'failed': 'Video processing failed'
    };

    return this.sendNotification(userId, {
      type: 'video_processing',
      title: 'Video Processing Update',
      message: messages[status] || 'Video processing status updated',
      data: {
        videoId,
        status,
        progress
      }
    });
  }

  async sendVideoUploadComplete(userId, videoData) {
    return this.sendNotification(userId, {
      type: 'video_uploaded',
      title: 'Video Upload Complete',
      message: `Your video "${videoData.title}" has been uploaded successfully and is being processed.`,
      data: {
        videoId: videoData.id,
        videoTitle: videoData.title
      }
    });
  }

  async sendVideoPublished(userId, videoData) {
    return this.sendNotification(userId, {
      type: 'video_published',
      title: 'Video Published',
      message: `Your video "${videoData.title}" is now live and available to viewers.`,
      data: {
        videoId: videoData.id,
        videoTitle: videoData.title,
        videoUrl: videoData.url
      }
    });
  }

  async sendVideoProcessingFailed(userId, videoData, error) {
    return this.sendNotification(userId, {
      type: 'video_processing_failed',
      title: 'Video Processing Failed',
      message: `Failed to process your video "${videoData.title}". Please try uploading again.`,
      data: {
        videoId: videoData.id,
        videoTitle: videoData.title,
        error: error.message
      }
    });
  }
}

module.exports = new NotificationService();
