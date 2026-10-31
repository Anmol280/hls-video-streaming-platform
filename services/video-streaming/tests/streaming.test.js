const { Readable } = require('stream');
const request = require('supertest');

jest.mock('../src/services/videoService', () => ({
  getVideoForStreaming: jest.fn(),
  checkConnection: jest.fn(),
  close: jest.fn()
}));

jest.mock('../src/services/storageService', () => ({
  exists: jest.fn(),
  readText: jest.fn(),
  createReadStream: jest.fn(),
  checkConnection: jest.fn()
}));

const videoService = require('../src/services/videoService');
const storageService = require('../src/services/storageService');
const app = require('../src');

const videoId = '4f0f9a20-68e5-4f8a-a4ee-449c26556d58';

beforeEach(() => {
  jest.clearAllMocks();
  videoService.getVideoForStreaming.mockResolvedValue({
    id: videoId,
    userId: '84fdf0a5-7776-4578-8c08-b14cf2cb921c',
    visibility: 'public',
    status: 'ready'
  });
  storageService.exists.mockResolvedValue(true);
});

describe('streaming HTTP routes', () => {
  test('serves the stored worker master playlist with an HLS content type', async () => {
    const playlist = '#EXTM3U\n#EXT-X-VERSION:3\n' +
      '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720\n720p/playlist.m3u8\n';
    storageService.readText.mockResolvedValue(playlist);

    const response = await request(app)
      .get('/api/stream/hls/' + videoId + '/playlist.m3u8')
      .expect(200)
      .expect('Content-Type', /application\/vnd\.apple\.mpegurl/);

    expect(response.text).toBe(playlist);
    expect(storageService.readText).toHaveBeenCalledWith(
      'transcoded/' + videoId + '/master.m3u8'
    );
  });

  test('serves an HLS segment as MPEG transport stream bytes', async () => {
    const bytes = Buffer.from([0x47, 0x40, 0x00, 0x10, 0x00]);
    storageService.createReadStream.mockReturnValue(Readable.from([bytes]));

    const response = await request(app)
      .get('/api/stream/hls/' + videoId + '/720p/segment_000.ts')
      .expect(200)
      .expect('Content-Type', 'video/mp2t');

    expect(Buffer.from(response.body)).toEqual(bytes);
    expect(storageService.createReadStream).toHaveBeenCalledWith(
      'transcoded/' + videoId + '/720p/segment_000.ts'
    );
  });

  test('blocks private videos unless the owner presents a valid bearer token', async () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    videoService.getVideoForStreaming.mockResolvedValue({
      id: videoId,
      userId: '84fdf0a5-7776-4578-8c08-b14cf2cb921c',
      visibility: 'private',
      status: 'ready'
    });
    storageService.readText.mockResolvedValue(
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=256x144\n144p/playlist.m3u8\n'
    );

    await request(app)
      .get('/api/stream/hls/' + videoId + '/playlist.m3u8')
      .expect(403);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: '84fdf0a5-7776-4578-8c08-b14cf2cb921c' },
      process.env.JWT_SECRET
    );
    await request(app)
      .get('/api/stream/hls/' + videoId + '/playlist.m3u8')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
  });
});
