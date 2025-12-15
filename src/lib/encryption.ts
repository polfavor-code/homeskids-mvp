/**
 * Encryption Utilities for Homes.kids
 * ====================================
 * Server-side AES-256-GCM encryption for sensitive data like ICS URLs.
 * Uses ENCRYPTION_KEY environment variable (32 bytes / 64 hex chars).
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * Key must be 32 bytes (64 hex characters).
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required for ICS URL encryption');
    }
    
    // Support both hex and base64 encoded keys
    let keyBuffer: Buffer;
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        // Hex encoded
        keyBuffer = Buffer.from(key, 'hex');
    } else if (key.length === 44 && key.endsWith('=')) {
        // Base64 encoded
        keyBuffer = Buffer.from(key, 'base64');
    } else {
        throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
    }
    
    if (keyBuffer.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must be 32 bytes, got ${keyBuffer.length}`);
    }
    
    return keyBuffer;
}

/**
 * Encrypt a string using AES-256-GCM.
 * Returns format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine: iv + authTag + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
}

/**
 * Decrypt a string encrypted with encrypt().
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted data: too short');
    }
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
    
    return decrypted.toString('utf8');
}

/**
 * Hash a string using SHA-256.
 * Used for URL deduplication without exposing the URL.
 */
export function hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

/**
 * Normalize an ICS URL before hashing.
 * - Convert webcal:// to https://
 * - Remove trailing slashes
 * - Lowercase the domain
 */
export function normalizeIcsUrl(url: string): string {
    let normalized = url.trim();
    
    // Convert webcal:// to https://
    if (normalized.startsWith('webcal://')) {
        normalized = 'https://' + normalized.substring(9);
    }
    
    // Ensure https://
    if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
        normalized = 'https://' + normalized;
    }
    
    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, '');
    
    // Parse and reconstruct to normalize
    try {
        const urlObj = new URL(normalized);
        // Lowercase the host only
        normalized = `${urlObj.protocol}//${urlObj.host.toLowerCase()}${urlObj.pathname}${urlObj.search}`;
    } catch {
        // If URL parsing fails, return as-is
    }
    
    return normalized;
}

/**
 * Mask an ICS URL for display.
 * Shows: "webcal://icloud.com/.../****.ics"
 */
export function maskIcsUrl(url: string): string {
    try {
        const normalized = normalizeIcsUrl(url);
        const urlObj = new URL(normalized);
        
        // Get the pathname parts
        const pathParts = urlObj.pathname.split('/');
        
        // Keep first 2 path segments, mask the rest
        let maskedPath = '';
        if (pathParts.length <= 3) {
            // Short path, just mask the last part
            maskedPath = pathParts.slice(0, -1).join('/') + '/****';
        } else {
            // Longer path, show first segment, mask middle, show extension
            maskedPath = '/' + pathParts[1] + '/.../****.ics';
        }
        
        return `webcal://${urlObj.host}${maskedPath}`;
    } catch {
        // If parsing fails, return a generic mask
        return 'webcal://.../****.ics';
    }
}

/**
 * Validate that a string looks like an ICS URL.
 */
export function isValidIcsUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }
    
    const trimmed = url.trim();
    
    // Check for webcal:// or https:// or http://
    if (!trimmed.match(/^(webcal|https?):\/\//i)) {
        return { valid: false, error: 'URL must start with webcal://, https://, or http://' };
    }
    
    // Basic URL validation
    try {
        const normalized = normalizeIcsUrl(trimmed);
        new URL(normalized);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
    
    // Check for .ics extension (common but not required)
    // iCloud URLs don't always have .ics but do have /subscribe paths
    const hasIcsExtension = trimmed.toLowerCase().endsWith('.ics');
    const hasSubscribePath = trimmed.toLowerCase().includes('/subscribe') || 
                              trimmed.toLowerCase().includes('/webcal');
    
    if (!hasIcsExtension && !hasSubscribePath) {
        // Warning but still valid - iCloud URLs vary
        return { 
            valid: true, 
            error: 'URL does not end with .ics. Make sure this is a calendar subscription link.' 
        };
    }
    
    return { valid: true };
}
