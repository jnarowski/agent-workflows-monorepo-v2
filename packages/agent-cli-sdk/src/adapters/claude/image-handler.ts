import { promises as fs } from "fs";
import { extname, isAbsolute } from "path";

/**
 * Supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

export type SupportedImageFormat = (typeof SUPPORTED_IMAGE_FORMATS)[number];

/**
 * Image input can be a file path or base64 data
 */
export type ImageInput = string | ImageData;

/**
 * Image data with metadata
 */
export interface ImageData {
  data: string; // Base64-encoded image data
  mimeType: string;
  filename?: string;
}

/**
 * Validate if file extension is a supported image format
 * @param filePath Path to image file
 * @returns True if format is supported
 */
export function isSupportedImageFormat(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_IMAGE_FORMATS.includes(ext as SupportedImageFormat);
}

/**
 * Get MIME type from file extension
 * @param filePath Path to image file
 * @returns MIME type string
 */
export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Read image file and convert to base64
 * @param filePath Path to image file
 * @returns Base64-encoded image data
 */
export async function readImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
}

/**
 * Process image input and convert to ImageData
 * @param input Image file path or ImageData object
 * @returns Processed ImageData
 */
export async function processImageInput(
  input: ImageInput
): Promise<ImageData> {
  // Already ImageData
  if (typeof input === "object") {
    validateImageData(input);
    return input;
  }

  // File path - validate and read
  if (!isAbsolute(input)) {
    throw new Error(`Image path must be absolute: ${input}`);
  }

  if (!isSupportedImageFormat(input)) {
    throw new Error(
      `Unsupported image format: ${extname(input)}. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(", ")}`
    );
  }

  // Check if file exists
  try {
    await fs.access(input);
  } catch {
    throw new Error(`Image file not found: ${input}`);
  }

  // Read and encode
  const data = await readImageAsBase64(input);
  const mimeType = getMimeType(input);
  const filename = input.split("/").pop();

  return {
    data,
    mimeType,
    filename,
  };
}

/**
 * Process multiple image inputs
 * @param inputs Array of image inputs
 * @returns Array of processed ImageData
 */
export async function processImageInputs(
  inputs: ImageInput[]
): Promise<ImageData[]> {
  return Promise.all(inputs.map((input) => processImageInput(input)));
}

/**
 * Validate ImageData object
 * @param imageData ImageData to validate
 * @throws Error if validation fails
 */
export function validateImageData(imageData: ImageData): void {
  if (!imageData.data || typeof imageData.data !== "string") {
    throw new Error("ImageData.data must be a non-empty string");
  }

  if (!imageData.mimeType || typeof imageData.mimeType !== "string") {
    throw new Error("ImageData.mimeType must be a non-empty string");
  }

  // Validate base64 format
  if (!isValidBase64(imageData.data)) {
    throw new Error("ImageData.data must be valid base64-encoded string");
  }

  // Validate MIME type
  const validMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validMimeTypes.includes(imageData.mimeType)) {
    throw new Error(
      `Invalid MIME type: ${imageData.mimeType}. Supported: ${validMimeTypes.join(", ")}`
    );
  }
}

/**
 * Check if string is valid base64
 * @param str String to check
 * @returns True if valid base64
 */
function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }

  try {
    // Base64 regex pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str);
  } catch {
    return false;
  }
}

/**
 * Format image for Claude CLI
 * Note: Claude CLI doesn't currently support images via command line,
 * but this prepares the data structure for future support
 * @param imageData Processed image data
 * @returns Formatted image object
 */
export function formatImageForCLI(imageData: ImageData): {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
} {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: imageData.mimeType,
      data: imageData.data,
    },
  };
}

/**
 * Calculate approximate size of base64-encoded image
 * @param base64Data Base64 string
 * @returns Size in bytes
 */
export function getBase64Size(base64Data: string): number {
  // Remove padding characters
  const withoutPadding = base64Data.replace(/=/g, "");

  // Base64 encoding increases size by ~33%
  // Actual size = (base64_length * 3) / 4
  return Math.floor((withoutPadding.length * 3) / 4);
}

/**
 * Validate image size doesn't exceed limit
 * @param imageData Image data to check
 * @param maxSizeBytes Maximum allowed size in bytes (default 5MB)
 * @throws Error if image exceeds size limit
 */
export function validateImageSize(
  imageData: ImageData,
  maxSizeBytes: number = 5 * 1024 * 1024
): void {
  const size = getBase64Size(imageData.data);

  if (size > maxSizeBytes) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`
    );
  }
}
