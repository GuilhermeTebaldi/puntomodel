import { apiFetch } from './api';

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
