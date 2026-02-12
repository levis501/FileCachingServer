/**
 * Fetch a URL from the internet
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options (timeout, etc.)
 * @returns {Object} { statusCode, headers, body: Buffer, contentType }
 */
export async function fetchURL(url, options = {}) {
  // Validate URL
  let parsedURL;
  try {
    parsedURL = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }

  // Only allow http and https
  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsedURL.protocol}. Only http: and https: are allowed.`);
  }

  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'FileCachingServer/1.0'
      }
    });

    clearTimeout(timeoutId);

    // Get response body as buffer
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    // Extract content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Convert Headers object to plain object
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      statusCode: response.status,
      headers,
      body,
      contentType
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle specific errors
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    // Handle fetch errors (network issues, DNS failures, etc.)
    if (error.cause) {
      throw new Error(`Network error: ${error.cause.code || error.cause.message}`);
    }

    throw new Error(`Failed to fetch: ${error.message}`);
  }
}
