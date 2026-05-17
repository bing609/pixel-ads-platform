/**
 * Cloudinary Image Service
 * Handles image upload, optimization, and CDN delivery
 * 
 * Features:
 * - Magic number validation (prevent fake uploads)
 * - Auto resize and WebP conversion
 * - Responsive image URLs
 * - Automatic cleanup on deletion
 */

import cloudinary from 'cloudinary';
import { validateMagicNumber, validateFileSize } from '../middleware/validation.js';

const v2 = cloudinary.v2;

v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  /**
   * Upload image to Cloudinary
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} fileName - Original file name
   * @param {string} folder - Cloudinary folder
   * @returns {object} Upload result with URLs
   */
  async uploadImage(fileBuffer, fileName, folder = 'pixel-ads') {
    try {
      // Validate file size
      const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 2097152; // 2MB default
      if (!validateFileSize(fileBuffer.length, maxFileSize)) {
        throw new Error(`File size exceeds limit of ${maxFileSize / 1024 / 1024}MB`);
      }

      // Detect file type from magic number
      let fileType = 'other';
      if (validateMagicNumber(fileBuffer, 'jpg')) fileType = 'jpg';
      else if (validateMagicNumber(fileBuffer, 'png')) fileType = 'png';
      else if (validateMagicNumber(fileBuffer, 'webp')) fileType = 'webp';
      else throw new Error('Invalid image file type');

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = v2.uploader.upload_stream(
          {
            folder: folder,
            resource_type: 'auto',
            quality: 'auto',
            eager: [
              { width: 8, height: 8, crop: 'scale', format: 'webp' }, // Thumbnail
              { width: 200, height: 200, crop: 'scale', format: 'webp' } // Preview
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      return {
        success: true,
        publicId: result.public_id,
        originalUrl: result.secure_url,
        thumbnailUrl: this.getResponsiveUrl(result.public_id, 8, 8),
        previewUrl: this.getResponsiveUrl(result.public_id, 200, 200),
        width: result.width,
        height: result.height,
        fileType: fileType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Cloudinary Upload Error:', error.message);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Get Responsive Image URL
   * @param {string} publicId - Cloudinary public ID
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {string} Responsive URL with WebP
   */
  getResponsiveUrl(publicId, width, height) {
    return v2.url(publicId, {
      width: width,
      height: height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {boolean} True if deletion successful
   */
  async deleteImage(publicId) {
    try {
      const result = await v2.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary Delete Error:', error.message);
      return false;
    }
  }

  /**
   * Verify image validity
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - MIME type
   * @returns {boolean} True if image is valid
   */
  validateImage(buffer, mimeType) {
    const allowedMimes = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    
    if (!allowedMimes.includes(mimeType)) {
      throw new Error('Invalid image MIME type');
    }

    // Validate magic number based on MIME type
    if (mimeType === 'image/jpeg') return validateMagicNumber(buffer, 'jpg');
    if (mimeType === 'image/png') return validateMagicNumber(buffer, 'png');
    if (mimeType === 'image/webp') return validateMagicNumber(buffer, 'webp');
    
    return false;
  }
}

export default new CloudinaryService();
