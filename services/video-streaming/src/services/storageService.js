const {
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

class StorageService {
  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 's3';
    this.bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
    this.storageRoot = path.resolve(
      process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage')
    );
    this.s3 = this.driver === 'local' ? null : new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
    });
  }

  localPath(key) {
    const resolved = path.resolve(this.storageRoot, ...key.split('/'));
    if (resolved !== this.storageRoot && !resolved.startsWith(this.storageRoot + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  async exists(key) {
    if (this.driver === 'local') {
      try {
        await fs.promises.access(this.localPath(key), fs.constants.R_OK);
        return true;
      } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
      }
    }
    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: key }));
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false;
      throw error;
    }
  }

  async readText(key) {
    if (this.driver === 'local') {
      return fs.promises.readFile(this.localPath(key), 'utf8');
    }
    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }));
    if (!result.Body) throw new Error('S3 returned an empty HLS playlist');
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  async createReadStream(key) {
    if (this.driver === 'local') return fs.createReadStream(this.localPath(key));
    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }));
    if (!result.Body) throw new Error('S3 returned an empty HLS segment');
    return result.Body;
  }

  async checkConnection() {
    if (this.driver === 'local') {
      await fs.promises.mkdir(this.storageRoot, { recursive: true });
      await fs.promises.access(this.storageRoot, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    }
    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    return true;
  }
}

module.exports = new StorageService();
