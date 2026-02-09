const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '';
const uploadFolder = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER ?? '';

export const uploadImageToCloudinary = async (file: File) => {
  if (!cloudName || !uploadPreset) {
    throw new Error('CLOUDINARY_NOT_CONFIGURED');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (uploadFolder) {
    formData.append('folder', uploadFolder);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'UPLOAD_FAILED');
  }

  const url = data?.secure_url || data?.url;
  if (!url) {
    throw new Error('UPLOAD_FAILED');
  }

  return url as string;
};
