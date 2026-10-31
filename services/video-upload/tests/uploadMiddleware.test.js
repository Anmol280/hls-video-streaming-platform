const fs = require('fs');
const express = require('express');
const request = require('supertest');
const {
  uploadVideo,
  cleanupUploadedFiles,
  maxBulkFiles
} = require('../src/middleware/upload');

describe('video upload middleware', () => {
  test('writes uploaded bytes to a temporary file instead of retaining a buffer', async () => {
    const app = express();
    app.post('/upload', uploadVideo, cleanupUploadedFiles, (req, res) => {
      res.status(201).json({
        hasBuffer: Object.prototype.hasOwnProperty.call(req.file, 'buffer'),
        fileExists: fs.existsSync(req.file.path),
        tempPath: req.file.path
      });
    });

    const response = await request(app)
      .post('/upload')
      .attach('video', Buffer.from('small test video payload'), {
        filename: 'clip.mp4',
        contentType: 'video/mp4'
      })
      .expect(201);

    expect(response.body.hasBuffer).toBe(false);
    expect(response.body.fileExists).toBe(true);
    expect(maxBulkFiles).toBe(2);
    fs.rmSync(response.body.tempPath, { force: true });
  });
});
