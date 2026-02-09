import multer from 'multer';
import cloudinary from './cloudinary.js';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadToCloudinary = (file, folder = 'puntomodel') =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(file.buffer);
  });
