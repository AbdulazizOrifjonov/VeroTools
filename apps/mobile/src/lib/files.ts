import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** What the API client's multipart uploads accept: { uri, name, type } on native, a Blob / File on the web. */
export type Uploadable = Blob | { uri: string; name: string; type: string };

export interface PickedImage {
  uri: string;
  file: Uploadable;
  size?: number;
}

export type PickError = 'permission' | 'too_large';

function extOf(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('heic')) return 'heic';
  return 'jpg';
}

async function toUploadable(asset: ImagePicker.ImagePickerAsset, index: number): Promise<Uploadable> {
  const type = asset.mimeType ?? 'image/jpeg';
  const name = asset.fileName ?? `photo-${Date.now()}-${index}.${extOf(type)}`;
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file;
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    try {
      return new File([blob], name, { type: blob.type || type });
    } catch {
      return blob;
    }
  }
  return { uri: asset.uri, name, type };
}

/**
 * Lets the customer pick photos from the library (or take one with the camera).
 * Returns null when cancelled; throws 'permission' / 'too_large' as `PickError`.
 */
export async function pickImages(
  options: { camera?: boolean; multiple?: boolean; limit?: number; square?: boolean; maxBytes?: number } = {},
): Promise<PickedImage[] | null> {
  const common: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.82,
    allowsEditing: !!options.square && !options.multiple,
    aspect: options.square ? [1, 1] : undefined,
    allowsMultipleSelection: !!options.multiple,
    selectionLimit: options.limit,
    exif: false,
  };
  if (options.camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw 'permission' as PickError;
  } else if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') throw 'permission' as PickError;
  }
  const result = options.camera
    ? await ImagePicker.launchCameraAsync(common)
    : await ImagePicker.launchImageLibraryAsync(common);
  if (result.canceled || !result.assets.length) return null;
  const assets = options.limit ? result.assets.slice(0, options.limit) : result.assets;
  if (options.maxBytes && assets.some((a) => (a.fileSize ?? 0) > options.maxBytes!))
    throw 'too_large' as PickError;
  return Promise.all(
    assets.map(async (a, i) => ({ uri: a.uri, size: a.fileSize, file: await toUploadable(a, i) })),
  );
}

export const cameraAvailable = Platform.OS !== 'web';
