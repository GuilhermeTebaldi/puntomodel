import { apiFetch, buildApiUrl } from './api';

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append('file', file);

  const res = await apiFetch('/upload/image', {
    method: 'POST',
    body: form,
  });

  const data = await res.json();
  return data.url;
};

export const uploadImageWithProgress = (file: File, onProgress?: (percent: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

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
