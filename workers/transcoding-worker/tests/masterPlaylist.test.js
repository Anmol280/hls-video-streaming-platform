const { makeMasterPlaylist } = require('../src/utils/masterPlaylist');

describe('worker master playlist', () => {
  test('writes relative variant URLs that resolve under the streaming master route', () => {
    const playlist = makeMasterPlaylist([
      { profile: { name: '720p', bitrate: '2500k' }, width: 1280, height: 720 },
      { profile: { name: '360p', bitrate: '500k' }, width: 640, height: 360 }
    ]);

    expect(playlist).toContain('#EXTM3U');
    expect(playlist).toContain('720p/playlist.m3u8');
    expect(playlist).toContain('360p/playlist.m3u8');
    expect(playlist).toContain('RESOLUTION=1280x720');
  });

  test('rejects empty or unsafe variant metadata', () => {
    expect(() => makeMasterPlaylist([])).toThrow();
    expect(() => makeMasterPlaylist([
      { profile: { name: '../private', bitrate: '100k' }, width: 16, height: 9 }
    ])).toThrow();
  });
});
