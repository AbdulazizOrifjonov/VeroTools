/**
 * Detects the real file type from magic bytes (never trust the client-supplied MIME type).
 * SVG is intentionally not accepted (can carry scripts).
 */
export type DetectedType = { mime: string; ext: string; kind: 'image' | 'document' };

export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png', kind: 'image' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  if (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a') return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (['avif', 'avis'].includes(brand)) return { mime: 'image/avif', ext: 'avif', kind: 'image' };
    if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) return { mime: 'image/heic', ext: 'heic', kind: 'image' };
  }
  if (buf.toString('ascii', 0, 5) === '%PDF-') return { mime: 'application/pdf', ext: 'pdf', kind: 'document' };
  return null;
}
