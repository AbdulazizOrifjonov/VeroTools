import multer from 'multer';
import { LIMITS } from '@vero/config';

/** In-memory uploads (validated by magic bytes, processed with sharp, then streamed to storage). */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.imageUploadMaxBytes, files: 20, fields: 20 },
});

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.attachmentUploadMaxBytes, files: 10, fields: 20 },
});

export const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.reviewImageMaxBytes, files: LIMITS.reviewImagesMax, fields: 5 },
});

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.avatarMaxBytes, files: 1, fields: 2 },
});
