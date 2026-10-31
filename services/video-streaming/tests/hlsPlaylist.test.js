const {
  masterKey,
  variantKey,
  segmentKey,
  validatePlaylist
} = require('../src/utils/hlsPlaylist');

const videoId = '4f0f9a20-68e5-4f8a-a4ee-449c26556d58';

describe('HLS storage and playlist contract', () => {
  test('maps master, variant and segment URLs to the worker output keys', () => {
    expect(masterKey(videoId)).toBe('transcoded/' + videoId + '/master.m3u8');
    expect(variantKey(videoId, '720p')).toBe(
      'transcoded/' + videoId + '/720p/playlist.m3u8'
    );
    expect(segmentKey(videoId, '720p', 'segment_003.ts')).toBe(
      'transcoded/' + videoId + '/720p/segment_003.ts'
    );
  });

  test('accepts the worker relative playlist paths used by browsers', () => {
    const master = '#EXTM3U\n#EXT-X-VERSION:3\n' +
      '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720\n720p/playlist.m3u8\n';
    const variant = '#EXTM3U\n#EXTINF:6.0,\nsegment_000.ts\n#EXT-X-ENDLIST\n';
    expect(validatePlaylist(master, 'master')).toBe(master);
    expect(validatePlaylist(variant, 'variant')).toBe(variant);
  });

  test('rejects path traversal and unsupported HLS resources', () => {
    expect(() => segmentKey(videoId, '720p', '../master.m3u8')).toThrow();
    expect(() => variantKey(videoId, '../../private')).toThrow();
    expect(() => validatePlaylist('#EXTM3U\nhttps://example.test/video.ts\n', 'master')).toThrow();
  });
});
