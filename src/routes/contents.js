import * as cache from '../services/cache.js';

/**
 * Register the /Contents route
 * @param {FastifyInstance} fastify
 */
export async function registerContentsRoute(fastify) {
  fastify.get('/Contents', async (request, reply) => {
    const list = await cache.list();
    return list;
  });
}
