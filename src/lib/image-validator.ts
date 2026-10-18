export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSizeBytes: number;
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_RESOLUTION_PX = 300; // minimum width and height

/**
 * Validates magic numbers of image buffer.
 */
export function detectImageMimeType(buffer: Buffer): "image/jpeg" | "image/png" | null {
  if (!buffer || buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}

/**
 * Extracts width and height from PNG header (IHDR chunk).
 */
function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  // IHDR starts at offset 12; width at 16, height at 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Extracts width and height from JPEG markers (SOF0, SOF2).
 */
function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2; // Skip SOI (FF D8)
  const len = buffer.length;

  while (offset < len - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF markers: C0 (Baseline), C1 (Extended), C2 (Progressive), C3 (Lossless)
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip variable-length marker segment
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }

  return null;
}

/**
 * Server-side content-based image inspection and validation.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  const fileSizeBytes = buffer.length;

  if (fileSizeBytes === 0) {
    return {
      isValid: false,
      error: "Uploaded file is empty.",
      fileSizeBytes: 0,
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size exceeds 5 MB limit (Uploaded: ${sizeMb} MB). Please choose a smaller file.`,
      fileSizeBytes,
    };
  }

  const detectedMime = detectImageMimeType(buffer);
  if (!detectedMime) {
    return {
      isValid: false,
      error: "Invalid image format. Only official JPG, JPEG, and PNG images are accepted.",
      fileSizeBytes,
    };
  }

  let dimensions: { width: number; height: number } | null = null;
  if (detectedMime === "image/png") {
    dimensions = getPngDimensions(buffer);
  } else if (detectedMime === "image/jpeg") {
    dimensions = getJpegDimensions(buffer);
  }

  if (dimensions) {
    if (dimensions.width < MIN_RESOLUTION_PX || dimensions.height < MIN_RESOLUTION_PX) {
      return {
        isValid: false,
        error: `Image resolution is too low (${dimensions.width}×${dimensions.height}px). Minimum required is ${MIN_RESOLUTION_PX}×${MIN_RESOLUTION_PX}px for official ID card printing.`,
        mimeType: detectedMime,
        width: dimensions.width,
        height: dimensions.height,
        fileSizeBytes,
      };
    }
  }

  return {
    isValid: true,
    mimeType: detectedMime,
    width: dimensions?.width,
    height: dimensions?.height,
    fileSizeBytes,
  };
}
