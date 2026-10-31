const fs = require('fs');
const path = require('path');
const { DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

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

  async uploadFile({ key, filePath, buffer, contentType, metadata = {} }) {
    if (this.driver === 'local') {
      const destination = this.localPath(key);
      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      if (filePath) {
        await fs.promises.copyFile(filePath, destination);
      } else if (buffer) {
        await fs.promises.writeFile(destination, buffer);
      } else {
        throw new TypeError('filePath or buffer is required');
      }
      return { Key: key, Location: 'storage://' + key };
    }

    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    const body = filePath ? fs.createReadStream(filePath) : buffer;
    if (!body) throw new TypeError('filePath or buffer is required');
    const safeMetadata = Object.fromEntries(Object.entries(metadata).map(([name, value]) => [
      name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      String(value).replace(/[\\r\\n]/g, ' ').slice(0, 512)
    ]));
    const result = await new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: safeMetadata,
        ServerSideEncryption: 'AES256'
      }
    }).done();
    return Object.assign(result, {
      Key: key,
      Location: 's3://' + this.bucketName + '/' + key
    });
  }

  async deleteFile(key) {
    if (this.driver === 'local') {
      await fs.promises.rm(this.localPath(key), { force: true });
      return true;
    }
    if (!this.bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
    return true;
  }
}

module.exports = new StorageService();
