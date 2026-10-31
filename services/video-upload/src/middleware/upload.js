const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const os = require('os');
const path = require('path');

const uploadDirectory = process.env.UPLOAD_TMP_DIR || path.join(os.tmpdir(), 'hls-video-uploads');
const configuredMaxSize = Number.parseInt(process.env.MAX_FILE_SIZE, 10);
const maxFileSize = Number.isFinite(configuredMaxSize) && configuredMaxSize > 0
  ? configuredMaxSize
  : 500 * 1024 * 1024;
const configuredThumbnailSize = Number.parseInt(process.env.MAX_THUMBNAIL_SIZE, 10);
const maxThumbnailSize = Number.isFinite(configuredThumbnailSize) && configuredThumbnailSize > 0
  ? Math.min(configuredThumbnailSize, 10 * 1024 * 1024)
  : 5 * 1024 * 1024;
const configuredBulkCount = Number.parseInt(process.env.MAX_BULK_FILES, 10);
const maxBulkFiles = Math.min(
  Math.max(Number.isFinite(configuredBulkCount) ? configuredBulkCount : 2, 1),
  5
);

const videoExtensions = new Set([
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
  '.m4v', '.3gp', '.mpeg', '.mpg', '.m4v'
]);
const imageExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.webp']);

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const isVideo = videoExtensions.has(extension) && file.mimetype.startsWith('video/');
  const isImage = imageExtensions.has(extension) && file.mimetype.startsWith('image/');

  if (isVideo || isImage) return callback(null, true);
  return callback(new Error('Only video and image files are allowed'));
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(uploadDirectory, { recursive: true }, error => callback(error, uploadDirectory));
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    callback(null, crypto.randomUUID() + extension);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: maxBulkFiles,
    fields: 10,
    fieldSize: 64 * 1024,
    fieldNameSize: 100,
    parts: maxBulkFiles + 10
  },
  fileFilter
});
const thumbnailUpload = multer({
  storage,
  limits: {
    fileSize: maxThumbnailSize,
    files: 1,
    fields: 5,
    fieldSize: 16 * 1024,
    fieldNameSize: 100,
    parts: 6
  },
  fileFilter
});

const uploadVideo = upload.single('video');
const uploadThumbnail = thumbnailUpload.single('thumbnail');
const uploadMultiple = upload.array('videos', maxBulkFiles);

function uploadedFiles(req) {
  return [req.file, ...(Array.isArray(req.files) ? req.files : [])]
    .filter(file => file && file.path);
}

function removeTemporaryFiles(req) {
  for (const file of uploadedFiles(req)) {
    fs.rm(file.path, { force: true }, () => {});
  }
}

function cleanupUploadedFiles(req, res, next) {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeTemporaryFiles(req);
  };
  res.once('finish', cleanup);
  res.once('close', cleanup);
  next();
}

function validateFileUpload(req, res, next) {
  if (!req.file && (!Array.isArray(req.files) || req.files.length === 0)) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  next();
}

function validateVideoMetadata(req, res, next) {
  const { title, description, visibility, tags } = req.body;

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Video title is required' });
  }
  if (title.trim().length > 100) {
    return res.status(400).json({ error: 'Title must be 100 characters or fewer' });
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
  }
  if (visibility && !['public', 'private', 'unlisted'].includes(visibility)) {
    return res.status(400).json({ error: 'Invalid video visibility' });
  }
  if (tags !== undefined && typeof tags !== 'string') {
    return res.status(400).json({ error: 'Tags must be a comma-separated string' });
  }
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagArray.length > 10 || tagArray.some(tag => tag.length > 20)) {
      return res.status(400).json({ error: 'Use up to 10 tags, each 20 characters or fewer' });
    }
  }
  return next();
}

function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    removeTemporaryFiles(req);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File exceeds the configured upload size limit' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Bulk uploads are limited to ' + maxBulkFiles });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: 'Upload rejected' });
  }

  if (error.message === 'Only video and image files are allowed') {
    removeTemporaryFiles(req);
    return res.status(400).json({ error: error.message });
  }
  return next(error);
}

module.exports = {
  uploadVideo,
  uploadThumbnail,
  uploadMultiple,
  validateFileUpload,
  validateVideoMetadata,
  cleanupUploadedFiles,
  handleMulterError,
  maxFileSize,
  maxThumbnailSize,
  maxBulkFiles
};
