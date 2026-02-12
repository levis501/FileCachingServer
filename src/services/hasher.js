import crypto from 'crypto';

/**
 * Generate a SHA-256 hash of a URL for use as a filesystem-safe filename
 * @param {string} url - The URL to hash
 * @returns {string} 64-character hex string
 */
export function hashURL(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}
