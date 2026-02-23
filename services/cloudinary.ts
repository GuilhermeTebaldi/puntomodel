import { apiFetch, buildApiUrl } from './api';

export type UploadImageOptions = {
  optimize?: boolean;
  maxDimension?: number;
  quality?: number;
  minFileSizeBytes?: number;
};

const OPTIMIZABLE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const replaceFileExtension = (name: string, extension: string) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return `upload.${extension}`;
  const withoutExtension = trimmed.replace(/\.[^/.]+$/, '');
  return `${withoutExtension}.${extension}`;
};

const extensionByMimeType = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const shouldOptimizeImage = (file: File, options?: UploadImageOptions) => {
  if (options?.optimize !== true) return false;
  const type = (file.type || '').toLowerCase();
  if (!OPTIMIZABLE_TYPES.has(type)) return false;
  const minFileSizeBytes = Number(options?.minFileSizeBytes || 800 * 1024);
  return file.size > minFileSizeBytes;
};

const optimizeImageFile = async (file: File, options?: UploadImageOptions) => {
  if (typeof document === 'undefined') return file;
  if (!shouldOptimizeImage(file, options)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('image_load_failed'));
      next.src = objectUrl;
    });

    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    if (!width || !height) return file;

    const maxDimension = Math.max(640, Number(options?.maxDimension || 1600));
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const resized = targetWidth !== width || targetHeight !== height;

    const sourceType = (file.type || '').toLowerCase();
    const targetType = sourceType === 'image/png' ? 'image/webp' : sourceType === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const quality = Math.min(0.95, Math.max(0.55, Number(options?.quality || 0.82)));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, targetType, quality);
    });
    if (!blob) return file;

    const keepsOriginalQuality = !resized && blob.size >= file.size * 0.98;
    if (keepsOriginalQuality) return file;

    const optimizedName = replaceFileExtension(file.name, extensionByMimeType(targetType));
    return new File([blob], optimizedName, { type: targetType, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const parseUploadResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return null;
  }
};

export const uploadImage = async (file: File, options?: UploadImageOptions) => {
  const uploadFile = await optimizeImageFile(file, options);
  const form = new FormData();
  form.append('file', uploadFile);

  const res = await apiFetch('/upload/image', {
    method: 'POST',
    body: form,
  });

  const data = await parseUploadResponse(res);
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || 'upload_failed');
  }
  return data.url;
};

export const uploadImageWithProgress = async (
  file: File,
  onProgress?: (percent: number) => void,
  options?: UploadImageOptions
) => {
  const uploadFile = await optimizeImageFile(file, options);
  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    form.append('file', uploadFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl('/upload/image'));
    xhr.responseType = 'json';

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = xhr.response || {};
        if (data?.url) {
          resolve(data.url);
        } else {
          reject(new Error('upload_failed'));
        }
      } else {
        reject(new Error('upload_failed'));
      }
    };

    xhr.onerror = () => reject(new Error('upload_failed'));
    xhr.onabort = () => reject(new Error('upload_aborted'));

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.min(100, Math.max(0, percent)));
      };
    }

    xhr.send(form);
  });
};
