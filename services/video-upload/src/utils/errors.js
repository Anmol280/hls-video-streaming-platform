class VideoUploadError extends Error {
  constructor(message, statusCode = 500, code = 'UPLOAD_ERROR') {
    super(message);
    this.name = 'VideoUploadError';
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

class FileValidationError extends VideoUploadError {
  constructor(message) {
    super(message, 400, 'FILE_VALIDATION_ERROR');
    this.name = 'FileValidationError';
  }
}

class S3UploadError extends VideoUploadError {
  constructor(message) {
    super(message, 500, 'S3_UPLOAD_ERROR');
    this.name = 'S3UploadError';
  }
}

class DatabaseError extends VideoUploadError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

class AuthenticationError extends VideoUploadError {
  constructor(message) {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends VideoUploadError {
  constructor(message) {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class VideoProcessingError extends VideoUploadError {
  constructor(message) {
    super(message, 500, 'VIDEO_PROCESSING_ERROR');
    this.name = 'VideoProcessingError';
  }
}

module.exports = {
  VideoUploadError,
  FileValidationError,
  S3UploadError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  VideoProcessingError
};
