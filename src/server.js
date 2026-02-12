import Fastify from 'fastify';
import cors from '@fastify/cors';
import config from './config/index.js';
import * as cache from './services/cache.js';
import { registerGetURLRoute } from './routes/geturl.js';
import { registerContentsRoute } from './routes/contents.js';

const fastify = Fastify({
  logger: {
    level: config.logLevel
  }
});

// Register plugins
await fastify.register(cors);

// Initialize cache
await cache.initializeCache(config.cacheDir);

// Register routes
await registerGetURLRoute(fastify);
await registerContentsRoute(fastify);

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    cacheDir: config.cacheDir,
    port: config.port
  };
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500);
  return {
    error: 'Internal server error',
    message: error.message
  };
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  try {
    await fastify.close();
    console.log('Server closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`\nFile Caching Server running on http://0.0.0.0:${config.port}`);
  console.log(`Cache directory: ${config.cacheDir}\n`);
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
