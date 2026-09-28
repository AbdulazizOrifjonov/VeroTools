import sharp from 'sharp';

export interface ProcessedImage {
  main: { buffer: Buffer; width: number; height: number };
  medium: { buffer: Buffer; width: number; height: number };
  thumb: { buffer: Buffer; width: number; height: number };
  mime: 'image/webp';
  ext: 'webp';
}

sharp.cache({ memory: 64, files: 0 });
sharp.concurrency(2);

async function variant(input: Buffer, max: number, quality: number) {
  const { data, info } = await sharp(input, { failOn: 'error', limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

/** Normalises an uploaded image: EXIF auto-rotate, strips metadata, converts to WebP in 3 sizes. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const [main, medium, thumb] = await Promise.all([variant(input, 1600, 84), variant(input, 800, 82), variant(input, 360, 78)]);
  return { main, medium, thumb, mime: 'image/webp', ext: 'webp' };
}
