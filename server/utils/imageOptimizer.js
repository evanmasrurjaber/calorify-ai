const sharp = require('sharp');

/**
 * Downscale and optimize an image buffer before sending to LLMs (e.g. Gemini).
 * Reduces payload size dramatically while preserving OCR readability for medical text and numbers.
 *
 * @param {Buffer} buffer - Original image buffer
 * @param {string} mimeType - Original MIME type (e.g. 'image/png', 'image/jpeg', 'application/pdf')
 * @param {object} [options]
 * @param {number} [options.maxDimension=1600] - Max width or height in pixels
 * @param {number} [options.quality=85] - JPEG compression quality (1-100)
 * @returns {Promise<{ buffer: Buffer, mimeType: string, isDownscaled: boolean, originalSize: number, optimizedSize: number }>}
 */
const optimizeImageForGemini = async (buffer, mimeType, options = {}) => {
  const originalSize = buffer.length;

  // If not an image (e.g., application/pdf), return untouched
  if (!mimeType || !mimeType.startsWith('image/')) {
    return {
      buffer,
      mimeType,
      isDownscaled: false,
      originalSize,
      optimizedSize: originalSize,
    };
  }

  const { maxDimension = 1600, quality = 85 } = options;

  try {
    const pipeline = sharp(buffer)
      .rotate() // Auto-orient based on EXIF tags (e.g. phone camera orientation)
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality,
        mozjpeg: true,
      });

    const optimizedBuffer = await pipeline.toBuffer();

    console.log(
      `[ImageOptimizer] Downscaled image: ${(originalSize / 1024).toFixed(1)} KB -> ${(optimizedBuffer.length / 1024).toFixed(1)} KB (${Math.round((1 - optimizedBuffer.length / originalSize) * 100)}% reduction)`
    );

    return {
      buffer: optimizedBuffer,
      mimeType: 'image/jpeg',
      isDownscaled: true,
      originalSize,
      optimizedSize: optimizedBuffer.length,
    };
  } catch (err) {
    console.warn('[ImageOptimizer] Downscaling failed, falling back to original buffer:', err.message);
    return {
      buffer,
      mimeType,
      isDownscaled: false,
      originalSize,
      optimizedSize: originalSize,
    };
  }
};

module.exports = { optimizeImageForGemini };
