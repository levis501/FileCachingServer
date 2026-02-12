import fs from 'fs/promises';
import path from 'path';
import { hashURL } from './hasher.js';

let cacheDir = null;
let indexPath = null;
let entriesDir = null;
let index = {};

/**
 * Initialize the cache system
 * @param {string} dir - Cache directory path
 */
export async function initializeCache(dir) {
  cacheDir = dir;
  entriesDir = path.join(cacheDir, 'entries');
  indexPath = path.join(cacheDir, 'index.json');

  // Create directories if they don't exist
  await fs.mkdir(entriesDir, { recursive: true });

  // Load or create index
  try {
    const data = await fs.readFile(indexPath, 'utf8');
    index = JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Index doesn't exist, create empty one
      index = {};
      await saveIndex();
    } else {
      throw error;
    }
  }

  console.log(`Cache initialized at ${cacheDir} with ${Object.keys(index).length} entries`);
}

/**
 * Save the index to disk atomically
 */
async function saveIndex() {
  const tempPath = indexPath + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(index, null, 2), 'utf8');
  await fs.rename(tempPath, indexPath);
}

/**
 * Get cached content for a URL
 * @param {string} url - The URL to look up
 * @returns {Object|null} { metadata, content } or null if not cached
 */
export async function get(url) {
  const hash = hashURL(url);

  if (!index[hash]) {
    return null;
  }

  const metaPath = path.join(entriesDir, `${hash}.meta.json`);
  const contentPath = path.join(entriesDir, `${hash}.content`);

  try {
    const [metaData, content] = await Promise.all([
      fs.readFile(metaPath, 'utf8'),
      fs.readFile(contentPath)
    ]);

    const metadata = JSON.parse(metaData);
    return { metadata, content };
  } catch (error) {
    // If files are missing but index has entry, clean up index
    if (error.code === 'ENOENT') {
      delete index[hash];
      await saveIndex();
      return null;
    }
    throw error;
  }
}

/**
 * Store a URL response in the cache
 * @param {string} url - The URL being cached
 * @param {Object} response - Response object with statusCode, headers, contentType
 * @param {Buffer} content - Response body
 */
export async function set(url, response, content) {
  const hash = hashURL(url);
  const metaPath = path.join(entriesDir, `${hash}.meta.json`);
  const contentPath = path.join(entriesDir, `${hash}.content`);

  const metadata = {
    url,
    hash,
    contentType: response.contentType,
    statusCode: response.statusCode,
    byteSize: content.length,
    cachedAt: new Date().toISOString(),
    headers: response.headers
  };

  // Write content atomically
  const contentTempPath = contentPath + '.tmp';
  await fs.writeFile(contentTempPath, content);
  await fs.rename(contentTempPath, contentPath);

  // Write metadata atomically
  const metaTempPath = metaPath + '.tmp';
  await fs.writeFile(metaTempPath, JSON.stringify(metadata, null, 2), 'utf8');
  await fs.rename(metaTempPath, metaPath);

  // Update index
  index[hash] = {
    url,
    byteSize: content.length,
    cachedAt: metadata.cachedAt
  };
  await saveIndex();

  console.log(`Cached ${url} (${content.length} bytes)`);
}

/**
 * List all cached URLs
 * @returns {Array} Array of { url, byteSize }
 */
export async function list() {
  return Object.values(index).map(({ url, byteSize }) => ({ url, byteSize }));
}
