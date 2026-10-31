const QUEUE_NAME = 'transcoding';
const JOB_NAME = 'transcode-video';

function buildTranscodingJob({ videoId, userId, inputPath, metadata }) {
  if (!videoId || !userId || !inputPath) {
    throw new TypeError('videoId, userId, and inputPath are required');
  }

  return {
    name: JOB_NAME,
    data: {
      videoId,
      userId,
      inputPath,
      outputBasePath: 'transcoded/' + videoId,
      metadata
    },
    options: {
      jobId: videoId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false
    }
  };
}

module.exports = { QUEUE_NAME, JOB_NAME, buildTranscodingJob };
