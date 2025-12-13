/**
 * Image utility functions for handling uploads with original and display versions.
 *
 * Rules:
 * - Always store the original image unchanged
 * - If longest edge > 300px, generate a resized "display" version (max 300px for thumbnails)
 * - If longest edge <= 300px, use original as display (no upscaling)
 * - Never upscale images
 */

const MAX_DISPLAY_SIZE = 300;

export interface ProcessedImage {
    original: Blob;
    display: Blob;
    needsResize: boolean;
    originalWidth: number;
    originalHeight: number;
    displayWidth: number;
    displayHeight: number;
}

/**
 * Get image dimensions from a File or Blob
 */
export function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Resize an image to fit within maxSize while maintaining aspect ratio.
 * Returns null if no resize is needed (image already smaller than maxSize).
 */
export function resizeImage(
    file: Blob,
    maxSize: number = MAX_DISPLAY_SIZE,
    quality: number = 0.85
): Promise<{ blob: Blob; width: number; height: number } | null> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);

            const { width, height } = img;
            const longestEdge = Math.max(width, height);

            // Don't upscale - if already smaller, return null
            if (longestEdge <= maxSize) {
                resolve(null);
                return;
            }

            // Calculate new dimensions maintaining aspect ratio
            const scale = maxSize / longestEdge;
            const newWidth = Math.round(width * scale);
            const newHeight = Math.round(height * scale);

            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Use high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve({ blob, width: newWidth, height: newHeight });
                    } else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image for resizing'));
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Process an image file to create original and display versions.
 * - Original: unchanged
 * - Display: max 1024px on longest edge (or original if smaller)
 */
export async function processImageForUpload(file: File): Promise<ProcessedImage> {
    const dimensions = await getImageDimensions(file);
    const { width, height } = dimensions;
    const longestEdge = Math.max(width, height);

    // Check if resize is needed
    const needsResize = longestEdge > MAX_DISPLAY_SIZE;

    if (!needsResize) {
        // No resize needed - use original for both
        return {
            original: file,
            display: file,
            needsResize: false,
            originalWidth: width,
            originalHeight: height,
            displayWidth: width,
            displayHeight: height,
        };
    }

    // Resize for display version
    const resized = await resizeImage(file, MAX_DISPLAY_SIZE);

    if (!resized) {
        // Fallback: use original for both
        return {
            original: file,
            display: file,
            needsResize: false,
            originalWidth: width,
            originalHeight: height,
            displayWidth: width,
            displayHeight: height,
        };
    }

    return {
        original: file,
        display: resized.blob,
        needsResize: true,
        originalWidth: width,
        originalHeight: height,
        displayWidth: resized.width,
        displayHeight: resized.height,
    };
}

/**
 * Generate file paths for original and display versions.
 * Structure: {familyId}/{timestamp}-{random}.{ext} for original
 *           {familyId}/{timestamp}-{random}_display.{ext} for display
 */
export function generateImagePaths(
    familyId: string,
    originalFileName: string
): { originalPath: string; displayPath: string } {
    const fileExt = originalFileName.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const baseName = `${timestamp}-${random}`;

    return {
        originalPath: `${familyId}/${baseName}_original.${fileExt}`,
        displayPath: `${familyId}/${baseName}_display.jpg`, // Always jpg for display
    };
}

/**
 * Get the display path from an original path, or vice versa.
 */
export function getDisplayPath(originalPath: string): string {
    // If path contains _original, replace with _display
    if (originalPath.includes('_original')) {
        return originalPath.replace('_original', '_display').replace(/\.[^.]+$/, '.jpg');
    }
    // Legacy paths without _original suffix - add _display before extension
    const lastDot = originalPath.lastIndexOf('.');
    if (lastDot === -1) return originalPath + '_display.jpg';
    return originalPath.substring(0, lastDot) + '_display.jpg';
}

/**
 * Check if a path is a display path
 */
export function isDisplayPath(path: string): boolean {
    return path.includes('_display');
}
