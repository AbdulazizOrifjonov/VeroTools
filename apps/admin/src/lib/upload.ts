import { ApiError } from '@vero/api-client';
import { API_HEADERS } from '@vero/config';
import type { AdminMedia, ApiErrorBody } from '@vero/types';
import { api } from './api';
import { getCurrentLanguage } from './language';

/**
 * Multipart upload with progress (XMLHttpRequest — fetch cannot report upload progress). Uses the same
 * headers as the API client and transparently refreshes an expired access token once.
 */
export function uploadWithProgress<T>(path: string, form: () => FormData, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<T> {
  const attempt = () =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api${path}`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader(API_HEADERS.client, 'admin');
      xhr.setRequestHeader(API_HEADERS.language, getCurrentLanguage());
      xhr.setRequestHeader('X-Client-Instance', api.instanceId);
      const token = api.client.getAccessToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(1);
          resolve((body as { data: T } | null)?.data as T);
          return;
        }
        const err = (body as ApiErrorBody | null)?.error;
        reject(new ApiError(xhr.status, err?.code ?? (xhr.status === 413 ? 'FILE_TOO_LARGE' : 'BAD_REQUEST'), err?.message ?? xhr.statusText, err?.fields, err?.details));
      };
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK', 'Network error'));
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(form());
    });

  return attempt().catch(async (error: unknown) => {
    if (error instanceof ApiError && error.status === 401 && (await api.client.refresh())) return attempt();
    throw error;
  });
}

/** Uploads images to the media library (the server converts them to WebP and makes thumbnails). */
export function uploadMedia(files: File[], folder: string, onProgress?: (fraction: number) => void, signal?: AbortSignal) {
  return uploadWithProgress<AdminMedia[]>(
    '/admin/media',
    () => {
      const fd = new FormData();
      fd.append('folder', folder);
      files.forEach((f) => fd.append('files', f));
      return fd;
    },
    onProgress,
    signal,
  );
}

/** Replaces the file of a media item in place (every entity using it gets the new URLs). */
export function replaceMediaFile(id: string, file: File, onProgress?: (fraction: number) => void) {
  return uploadWithProgress<AdminMedia>(
    `/admin/media/${encodeURIComponent(id)}/replace`,
    () => {
      const fd = new FormData();
      fd.append('file', file);
      return fd;
    },
    onProgress,
  );
}

/** Expense receipts (images or PDF). */
export function uploadExpenseAttachments(files: File[], onProgress?: (fraction: number) => void) {
  return uploadWithProgress<AdminMedia[]>(
    '/admin/expenses/attachments',
    () => {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      return fd;
    },
    onProgress,
  );
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic';
export const ATTACHMENT_ACCEPT = `${IMAGE_ACCEPT},application/pdf`;
