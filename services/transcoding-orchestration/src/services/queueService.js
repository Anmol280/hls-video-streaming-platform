const Bull = require('bull');
const logger = require('../utils/logger');

// Initialize queues
const transcodingQueue = new Bull('video transcoding', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000
    }
  }
});

const thumbnailQueue = new Bull('thumbnail generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    }
  }
});

const cleanupQueue = new Bull('cleanup', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 1
  }
});

class QueueService {
  constructor() {
    this.queues = {
      transcoding: transcodingQueue,
      thumbnail: thumbnailQueue,
      cleanup: cleanupQueue
    };
  }

  async initializeQueues() {
    // Set up job processors
    await this.setupProcessors();
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.info('All queues initialized successfully');
  }

  async setupProcessors() {
    // Transcoding processor
    transcodingQueue.process('transcode-video', 3, require('../workers/transcodingWorker').processTranscoding);
    
    // Thumbnail processor
    thumbnailQueue.process('generate-thumbnails', 5, require('../workers/thumbnailWorker').processThumbnail);
    
    // Cleanup processor
    cleanupQueue.process('cleanup-files', 1, require('../workers/cleanupWorker').processCleanup);
  }

  setupEventListeners() {
    Object.entries(this.queues).forEach(([name, queue]) => {
      queue.on('completed', (job, result) => {
        logger.info(`Job completed in ${name} queue`, {
          jobId: job.id,
          jobType: job.name,
          processingTime: job.finishedOn - job.processedOn,
          result
        });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job failed in ${name} queue`, {
          jobId: job.id,
          jobType: job.name,
          attempts: job.attemptsMade,
          error: err.message
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in ${name} queue`, {
          jobId: job.id,
          jobType: job.name
        });
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job progress in ${name} queue`, {
          jobId: job.id,
          progress: `${progress}%`
        });
      });
    });
  }

  async addTranscodingJob(jobData, options = {}) {
    try {
      const job = await transcodingQueue.add('transcode-video', jobData, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.info('Transcoding job added to queue', {
        jobId: job.id,
        videoId: jobData.videoId
      });

      return job;
    } catch (error) {
      logger.error('Failed to add transcoding job:', error);
      throw error;
    }
  }

  async addThumbnailJob(jobData, options = {}) {
    try {
      const job = await thumbnailQueue.add('generate-thumbnails', jobData, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.info('Thumbnail job added to queue', {
        jobId: job.id,
        videoId: jobData.videoId
      });

      return job;
    } catch (error) {
      logger.error('Failed to add thumbnail job:', error);
      throw error;
    }
  }

  async addCleanupJob(jobData, options = {}) {
    try {
      const job = await cleanupQueue.add('cleanup-files', jobData, {
        delay: options.delay || 0,
        ...options
      });

      logger.info('Cleanup job added to queue', {
        jobId: job.id,
        type: jobData.type
      });

      return job;
    } catch (error) {
      logger.error('Failed to add cleanup job:', error);
      throw error;
    }
  }

  async getJob(queueName, jobId) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  async cancelJob(queueName, jobId) {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    if (['waiting', 'delayed', 'active'].includes(state)) {
      await job.remove();
      return true;
    }

    return false;
  }

  async retryJob(queueName, jobId) {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.retry();
    return true;
  }

  async updateJobPriority(queueName, jobId, priority) {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.changePriority(priority);
    return true;
  }

  async getQueueStatus() {
    const status = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      status[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    }

    return status;
  }

  async getJobsByUserId(userId, options = {}) {
    const { status = 'all', limit = 50, offset = 0 } = options;
    const jobs = [];

    for (const queue of Object.values(this.queues)) {
      let queueJobs = [];

      if (status === 'all') {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed()
        ]);
        queueJobs = [...waiting, ...active, ...completed, ...failed];
      } else {
        switch (status) {
          case 'waiting':
            queueJobs = await queue.getWaiting();
            break;
          case 'active':
            queueJobs = await queue.getActive();
            break;
          case 'completed':
            queueJobs = await queue.getCompleted();
            break;
          case 'failed':
            queueJobs = await queue.getFailed();
            break;
        }
      }

      // Filter by userId
      const userJobs = queueJobs.filter(job => job.data.userId === userId);
      jobs.push(...userJobs);
    }

    // Sort by created time (newest first)
    jobs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const paginatedJobs = jobs.slice(offset, offset + limit);

    return {
      jobs: paginatedJobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        state: job.getState(),
        createdAt: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason
      })),
      total: jobs.length,
      hasMore: offset + limit < jobs.length
    };
  }

  async healthCheck() {
    try {
      const status = await this.getQueueStatus();
      
      // Check if any queue has too many failed jobs
      const alerts = [];
      for (const [name, queueStatus] of Object.entries(status)) {
        if (queueStatus.failed > 100) {
          alerts.push(`High failure rate in ${name} queue: ${queueStatus.failed} failed jobs`);
        }
        
        if (queueStatus.waiting > 1000) {
          alerts.push(`High queue backlog in ${name}: ${queueStatus.waiting} waiting jobs`);
        }
      }

      if (alerts.length > 0) {
        logger.warn('Queue health check alerts:', { alerts });
      }

      return { status, alerts };
    } catch (error) {
      logger.error('Queue health check failed:', error);
      throw error;
    }
  }

  async closeQueues() {
    try {
      await Promise.all(
        Object.values(this.queues).map(queue => queue.close())
      );
      logger.info('All queues closed successfully');
    } catch (error) {
      logger.error('Error closing queues:', error);
    }
  }
}

const queueService = new QueueService();

module.exports = {
  queueService,
  initializeQueues: () => queueService.initializeQueues(),
  closeQueues: () => queueService.closeQueues(),
  transcodingQueue,
  thumbnailQueue,
  cleanupQueue
};
