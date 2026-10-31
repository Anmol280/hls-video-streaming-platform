const profileNames = new Set(['1080p', '720p', '480p', '360p', '240p', '144p']);

function makeMasterPlaylist(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('At least one HLS variant is required');
  }
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const variant of variants) {
    const { profile, width, height } = variant;
    if (!profileNames.has(profile.name) ||
        !Number.isInteger(width) || width < 1 ||
        !Number.isInteger(height) || height < 1) {
      throw new Error('Invalid HLS variant metadata');
    }
    const bitrateKbps = Number.parseInt(profile.bitrate, 10);
    if (!Number.isFinite(bitrateKbps) || bitrateKbps < 1) {
      throw new Error('Invalid HLS variant bitrate');
    }
    const bandwidth = Math.round(bitrateKbps * 1000 * 1.15);
    lines.push(
      '#EXT-X-STREAM-INF:BANDWIDTH=' + bandwidth +
      ',RESOLUTION=' + width + 'x' + height
    );
    lines.push(profile.name + '/playlist.m3u8');
  }
  return lines.join('\n') + '\n';
}

module.exports = { makeMasterPlaylist };
