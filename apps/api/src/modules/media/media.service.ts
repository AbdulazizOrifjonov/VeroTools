import { Types } from 'mongoose';
import type { AdminMedia, MediaFolder } from '@vero/types';
import { Media, type IMedia } from '../../models/media.model';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { Brand } from '../../models/brand.model';
import { Banner, Promotion } from '../../models/marketing.model';
import { User } from '../../models/user.model';
import { Review } from '../../models/review.model';
import { Expense } from '../../models/expense.model';
import { getStorage } from '../../lib/storage';
import { detectFileType } from '../../lib/file-type';
import { processImage } from '../../lib/images';
import { HttpError, notFound } from '../../lib/http-error';
import { absoluteUrl, iso } from '../../lib/localize';
import type { ImageValue, Localized } from '../../models/common';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface Uploader {
  id?: Types.ObjectId;
  name?: string;
}

const datePath = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const safeName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .slice(0, 120) || 'file';

async function storeImage(file: UploadedFile, folder: MediaFolder, id: Types.ObjectId) {
  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(file.buffer);
  } catch {
    // valid magic bytes but undecodable / truncated data
    throw new HttpError(415, 'FILE_TYPE_NOT_ALLOWED', 'The image file is damaged or cannot be processed');
  }
  const storage = getStorage();
  const base = `${folder}/${datePath()}/${String(id)}`;
  const [main, medium, thumb] = await Promise.all([
    storage.put(`${base}.webp`, processed.main.buffer, processed.mime),
    storage.put(`${base}-800.webp`, processed.medium.buffer, processed.mime),
    storage.put(`${base}-360.webp`, processed.thumb.buffer, processed.mime),
  ]);
  return {
    provider: storage.provider,
    key: main.key,
    url: main.url,
    variants: { medium: { key: medium.key, url: medium.url }, thumb: { key: thumb.key, url: thumb.url } },
    mime: processed.mime,
    size: processed.main.buffer.length,
    width: processed.main.width,
    height: processed.main.height,
    filename: `${String(id)}.webp`,
  };
}

/**
 * Validates (magic bytes), optimises (WebP, 3 sizes) and stores an image. Documents (PDF) are
 * accepted only when `allowDocuments` is set (expense receipts).
 */
export async function uploadFile(
  file: UploadedFile,
  folder: MediaFolder,
  uploader: Uploader = {},
  opts: { allowDocuments?: boolean; alt?: Partial<Localized>; tags?: string[] } = {},
): Promise<IMedia> {
  const type = detectFileType(file.buffer);
  if (!type || (type.kind === 'document' && !opts.allowDocuments)) {
    throw new HttpError(415, 'FILE_TYPE_NOT_ALLOWED', 'Only JPEG, PNG, WebP, GIF or AVIF images are allowed');
  }
  const id = new Types.ObjectId();
  let stored: Omit<Awaited<ReturnType<typeof storeImage>>, 'mime'> & { mime: string };
  if (type.kind === 'image') {
    stored = await storeImage(file, folder, id);
  } else {
    const storage = getStorage();
    const key = `${folder}/${datePath()}/${String(id)}.${type.ext}`;
    const put = await storage.put(key, file.buffer, type.mime);
    stored = { provider: storage.provider, key: put.key, url: put.url, variants: {} as never, mime: type.mime, size: file.size, width: 0, height: 0, filename: `${String(id)}.${type.ext}` };
  }
  return (
    await Media.create({
      _id: id,
      ...stored,
      width: stored.width || undefined,
      height: stored.height || undefined,
      folder,
      originalName: safeName(file.originalname),
      alt: { uz: opts.alt?.uz ?? '', ru: opts.alt?.ru ?? '', en: opts.alt?.en ?? '' },
      tags: opts.tags ?? [],
      uploadedBy: uploader.id,
      uploadedByName: uploader.name,
    })
  ).toObject() as IMedia;
}

/** Embeddable image value (entities keep media id + denormalised URLs). */
export function toImageValue(m: IMedia, alt?: Localized): ImageValue {
  return {
    media: m._id,
    url: m.url,
    medium: m.variants?.medium?.url ?? m.url,
    thumb: m.variants?.thumb?.url ?? m.url,
    width: m.width,
    height: m.height,
    alt: alt ?? m.alt,
  };
}

export async function imageFromMediaId(id: string | Types.ObjectId | undefined | null): Promise<ImageValue | undefined> {
  if (!id) return undefined;
  const m = await Media.findById(id).lean();
  if (!m) throw new HttpError(422, 'VALIDATION_ERROR', 'Image not found in media library', { fields: { media: 'errors.NOT_FOUND' } });
  return toImageValue(m);
}

export async function imagesFromMediaIds(ids: Array<string | Types.ObjectId>): Promise<ImageValue[]> {
  if (!ids.length) return [];
  const docs = await Media.find({ _id: { $in: ids } }).lean<IMedia[]>();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return ids.map((id) => byId.get(String(id))).filter((m): m is IMedia => !!m).map((m) => toImageValue(m));
}

async function usage(id: Types.ObjectId): Promise<number> {
  const counts = await Promise.all([
    Product.countDocuments({ $or: [{ 'images.media': id }, { 'variants.image.media': id }] }),
    Category.countDocuments({ 'image.media': id }),
    Brand.countDocuments({ 'logo.media': id }),
    Banner.countDocuments({ $or: [{ 'imageDesktop.media': id }, { 'imageMobile.media': id }] }),
    Promotion.countDocuments({ 'image.media': id }),
    User.countDocuments({ 'avatar.media': id }),
    Review.countDocuments({ 'images.media': id }),
    Expense.countDocuments({ 'attachments.media': id }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

export async function refreshUsageCount(id: Types.ObjectId) {
  const n = await usage(id);
  await Media.updateOne({ _id: id }, { $set: { usageCount: n } });
  return n;
}

/** Refreshes the usage counters of the given media ids (after an entity's images changed). */
export async function refreshUsageCounts(ids: Array<string | Types.ObjectId | undefined | null>) {
  const unique = [...new Set(ids.filter(Boolean).map(String))].filter((id) => Types.ObjectId.isValid(id));
  for (const id of unique) await refreshUsageCount(new Types.ObjectId(id));
}

type UsageRow = { _id: Types.ObjectId | null; n: number };

/**
 * Recomputes `usageCount` of every media item from all referencing collections (scheduled job + after
 * seeding). The admin "unused" filter relies on it; deleting still re-checks real usage.
 */
export async function recountAllMediaUsage(): Promise<{ used: number; total: number }> {
  const counts = new Map<string, number>();
  const add = (rows: UsageRow[]) => {
    for (const r of rows) if (r._id) counts.set(String(r._id), (counts.get(String(r._id)) ?? 0) + r.n);
  };
  const byField = (field: string) => [{ $match: { [field.slice(1)]: { $exists: true } } }, { $group: { _id: field, n: { $sum: 1 } } }];
  const results = await Promise.all([
    Product.aggregate<UsageRow>([{ $unwind: '$images' }, ...byField('$images.media')]),
    Product.aggregate<UsageRow>([{ $unwind: '$variants' }, ...byField('$variants.image.media')]),
    Category.aggregate<UsageRow>(byField('$image.media')),
    Brand.aggregate<UsageRow>(byField('$logo.media')),
    Banner.aggregate<UsageRow>(byField('$imageDesktop.media')),
    Banner.aggregate<UsageRow>(byField('$imageMobile.media')),
    Promotion.aggregate<UsageRow>(byField('$image.media')),
    User.aggregate<UsageRow>(byField('$avatar.media')),
    Review.aggregate<UsageRow>([{ $unwind: '$images' }, ...byField('$images.media')]),
    Expense.aggregate<UsageRow>([{ $unwind: '$attachments' }, ...byField('$attachments.media')]),
  ]);
  results.forEach(add);
  const ops = [...counts.entries()].map(([id, n]) => ({ updateOne: { filter: { _id: new Types.ObjectId(id), usageCount: { $ne: n } }, update: { $set: { usageCount: n } } } }));
  for (let i = 0; i < ops.length; i += 500) await Media.bulkWrite(ops.slice(i, i + 500), { ordered: false });
  const used = [...counts.keys()].map((id) => new Types.ObjectId(id));
  await Media.updateMany({ _id: { $nin: used }, usageCount: { $ne: 0 } }, { $set: { usageCount: 0 } });
  return { used: used.length, total: await Media.estimatedDocumentCount() };
}

async function removeObjects(m: IMedia) {
  const storage = getStorage();
  await Promise.all([m.key, m.variants?.medium?.key, m.variants?.thumb?.key].filter(Boolean).map((k) => storage.remove(k!)));
}

/** Replaces the file of a media item in place; every entity using it gets the new URLs. */
export async function replaceMedia(id: string, file: UploadedFile, uploader: Uploader = {}): Promise<IMedia> {
  const current = await Media.findById(id).lean();
  if (!current) throw notFound('Media');
  const type = detectFileType(file.buffer);
  if (!type || type.kind !== 'image') throw new HttpError(415, 'FILE_TYPE_NOT_ALLOWED', 'Only images can replace images');
  const stored = await storeImage(file, current.folder, new Types.ObjectId());
  const updated = await Media.findByIdAndUpdate(
    id,
    { $set: { ...stored, originalName: safeName(file.originalname), uploadedBy: uploader.id ?? current.uploadedBy, uploadedByName: uploader.name ?? current.uploadedByName } },
    { new: true },
  ).lean();
  const mediaId = current._id;
  const set = (prefix: string) => ({
    [`${prefix}.url`]: stored.url,
    [`${prefix}.medium`]: stored.variants.medium.url,
    [`${prefix}.thumb`]: stored.variants.thumb.url,
    [`${prefix}.width`]: stored.width,
    [`${prefix}.height`]: stored.height,
  });
  await Promise.all([
    Product.updateMany({ 'images.media': mediaId }, { $set: set('images.$[img]') }, { arrayFilters: [{ 'img.media': mediaId }] }),
    Product.updateMany({ 'variants.image.media': mediaId }, { $set: set('variants.$[v].image') }, { arrayFilters: [{ 'v.image.media': mediaId }] }),
    Category.updateMany({ 'image.media': mediaId }, { $set: set('image') }),
    Brand.updateMany({ 'logo.media': mediaId }, { $set: set('logo') }),
    Banner.updateMany({ 'imageDesktop.media': mediaId }, { $set: set('imageDesktop') }),
    Banner.updateMany({ 'imageMobile.media': mediaId }, { $set: set('imageMobile') }),
    Promotion.updateMany({ 'image.media': mediaId }, { $set: set('image') }),
    User.updateMany({ 'avatar.media': mediaId }, { $set: set('avatar') }),
  ]);
  await removeObjects(current);
  return updated!;
}

export async function deleteMedia(id: string, force = false): Promise<void> {
  const m = await Media.findById(id).lean();
  if (!m) throw notFound('Media');
  const n = await usage(m._id);
  if (n > 0 && !force) throw new HttpError(409, 'IN_USE', 'This file is used by other records', { details: { usageCount: n } });
  await removeObjects(m);
  await Media.deleteOne({ _id: m._id });
}

export function toAdminMedia(m: IMedia): AdminMedia {
  return {
    id: String(m._id),
    provider: m.provider,
    folder: m.folder,
    url: absoluteUrl(m.url)!,
    mediumUrl: absoluteUrl(m.variants?.medium?.url),
    thumbUrl: absoluteUrl(m.variants?.thumb?.url),
    filename: m.filename,
    originalName: m.originalName,
    mime: m.mime,
    size: m.size,
    width: m.width,
    height: m.height,
    alt: m.alt ?? { uz: '', ru: '', en: '' },
    tags: m.tags ?? [],
    usageCount: m.usageCount ?? 0,
    uploadedBy: m.uploadedBy ? { id: String(m.uploadedBy), name: m.uploadedByName ?? '' } : undefined,
    createdAt: iso(m.createdAt)!,
    updatedAt: iso(m.updatedAt)!,
  };
}
