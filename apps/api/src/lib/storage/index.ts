import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import type { MediaProvider } from '@vero/types';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface StoredObject {
  key: string;
  /** relative ("/uploads/…") for local storage, absolute for cloud storage */
  url: string;
}

export interface StorageDriver {
  readonly provider: MediaProvider;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}

/** Local disk storage served by the API under /uploads (use a CDN / object storage in production). */
class LocalStorage implements StorageDriver {
  readonly provider = 'local' as const;
  constructor(private readonly root: string) {}

  private path(key: string) {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return join(this.root, safe);
  }

  async put(key: string, body: Buffer): Promise<StoredObject> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return { key, url: `/uploads/${key}` };
  }

  async remove(key: string) {
    await unlink(this.path(key)).catch(() => undefined);
  }
}

/** Any S3-compatible object storage (AWS S3, DigitalOcean Spaces, MinIO, Yandex Object Storage…). */
class S3Storage implements StorageDriver {
  readonly provider = 's3' as const;
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }

  private publicUrl(key: string) {
    if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
    if (env.S3_ENDPOINT) return `${env.S3_ENDPOINT.replace(/\/+$/, '')}/${env.S3_BUCKET}/${key}`;
    return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: this.publicUrl(key) };
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key })).catch((err) => logger.warn({ err, key }, 's3 delete failed'));
  }
}

/** Cloudinary (configured with CLOUDINARY_URL=cloudinary://key:secret@cloud_name). */
class CloudinaryStorage implements StorageDriver {
  readonly provider = 'cloudinary' as const;
  constructor() {
    cloudinary.config({ secure: true });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const publicId = key.replace(/\.[a-z0-9]+$/i, '');
    const resourceType = contentType.startsWith('image/') ? 'image' : 'raw';
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: resourceType, overwrite: true },
        (err, res) => (err || !res ? reject(err ?? new Error('upload failed')) : resolve(res)),
      );
      stream.end(body);
    });
    return { key: result.public_id, url: result.secure_url };
  }

  async remove(key: string) {
    await cloudinary.uploader.destroy(key).catch((err: unknown) => logger.warn({ err, key }, 'cloudinary delete failed'));
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  // env.ts refuses to start with an incomplete remote-storage configuration
  if (env.STORAGE_DRIVER === 's3') driver = new S3Storage();
  else if (env.STORAGE_DRIVER === 'cloudinary') driver = new CloudinaryStorage();
  else driver = new LocalStorage(env.UPLOAD_DIR);
  logger.info({ provider: driver.provider }, 'media storage ready');
  return driver;
}
