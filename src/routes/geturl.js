import * as cache from '../services/cache.js';
import { fetchURL } from '../services/fetcher.js';
import config from '../config/index.js';

/**
 * Register the /GetURL route
 * @param {FastifyInstance} fastify
 */
export async function registerGetURLRoute(fastify) {
  fastify.get('/GetURL', async (request, reply) => {
    const { url } = request.query;

    // Validate URL parameter
    if (!url) {
      reply.code(400);
      return {
        error: 'Missing required parameter',
        message: 'URL parameter is required',
        example: '/GetURL?url=https://example.com'
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      reply.code(400);
      return {
        error: 'Invalid URL',
        message: error.message,
        url
      };
    }

    try {
      // Check cache first
      const cached = await cache.get(url);

      if (cached) {
        // Cache hit - return cached content
        request.log.info({ url, cached: true }, 'Cache HIT');
        reply.type(cached.metadata.contentType);
        return cached.content;
      }

      // Cache miss - fetch from internet
      request.log.info({ url, cached: false }, 'Cache MISS - fetching');

      const response = await fetchURL(url, { timeout: config.fetchTimeout });

      // Only cache successful responses (2xx)
      if (response.statusCode >= 200 && response.statusCode < 300) {
        await cache.set(url, response, response.body);
        reply.type(response.contentType);
        return response.body;
      } else {
        // Don't cache error responses
        reply.code(response.statusCode);
        return {
          error: 'Upstream error',
          message: `Received ${response.statusCode} from upstream server`,
          url,
          statusCode: response.statusCode
        };
      }
    } catch (error) {
      // Network error, timeout, or other failure
      request.log.error({ url, error: error.message }, 'Failed to fetch URL');
      reply.code(502);
      return {
        error: 'Failed to fetch URL',
        message: error.message,
        url
      };
    }
  });
}
