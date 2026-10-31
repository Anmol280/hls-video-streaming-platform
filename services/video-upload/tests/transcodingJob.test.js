const { QUEUE_NAME, JOB_NAME, buildTranscodingJob } = require('../src/utils/transcodingJob');

describe('transcoding job contract', () => {
  test('matches the worker queue and uses the video UUID as Bull job ID', () => {
    const job = buildTranscodingJob({
      videoId: '4f0f9a20-68e5-4f8a-a4ee-449c26556d58',
      userId: '84fdf0a5-7776-4578-8c08-b14cf2cb921c',
      inputPath: 'videos/originals/video.mp4',
      metadata: { duration: 12, width: 1280, height: 720 }
    });

    expect(QUEUE_NAME).toBe('transcoding');
    expect(job.name).toBe(JOB_NAME);
    expect(job.options.jobId).toBe(job.data.videoId);
    expect(job.data).toMatchObject({
      inputPath: 'videos/originals/video.mp4',
      outputBasePath: 'transcoded/4f0f9a20-68e5-4f8a-a4ee-449c26556d58'
    });
  });

  test('rejects incomplete worker payloads', () => {
    expect(() => buildTranscodingJob({ videoId: 'v1' })).toThrow(TypeError);
  });
});
