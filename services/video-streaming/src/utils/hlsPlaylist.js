const VIDEO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUALITIES = new Set(['1080p', '720p', '480p', '360p', '240p', '144p']);

function validateVideoId(videoId) {
  if (!VIDEO_ID_PATTERN.test(videoId || '')) {
    const error = new Error('Invalid video ID');
    error.status = 400;
    throw error;
  }
}

function masterKey(videoId) {
  validateVideoId(videoId);
  return 'transcoded/' + videoId + '/master.m3u8';
}

function variantKey(videoId, quality) {
  validateVideoId(videoId);
  if (!QUALITIES.has(quality)) throw new Error('Invalid video quality');
  return 'transcoded/' + videoId + '/' + quality + '/playlist.m3u8';
}

function segmentKey(videoId, quality, segmentName) {
  validateVideoId(videoId);
  if (!QUALITIES.has(quality)) throw new Error('Invalid video quality');
  if (!/^segment_[0-9]{1,10}\.ts$/.test(segmentName || '')) {
    throw new Error('Invalid HLS segment name');
  }
  return 'transcoded/' + videoId + '/' + quality + '/' + segmentName;
}

function validatePlaylist(playlist, kind) {
  if (typeof playlist !== 'string' || !playlist.startsWith('#EXTM3U')) {
    throw new Error('Invalid HLS playlist');
  }
  const uriLines = playlist.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  if (!uriLines.length) throw new Error('HLS playlist contains no media entries');

  if (kind === 'master') {
    if (uriLines.some(uri => !/^(1080p|720p|480p|360p|240p|144p)\/playlist\.m3u8$/.test(uri))) {
      throw new Error('Master playlist contains an invalid variant path');
    }
  } else if (uriLines.some(uri => !/^segment_[0-9]{1,10}\.ts$/.test(uri))) {
    throw new Error('Variant playlist contains an invalid segment path');
  }
  return playlist;
}

module.exports = { masterKey, variantKey, segmentKey, validatePlaylist, QUALITIES };
