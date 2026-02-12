export default {
  port: parseInt(process.env.PORT) || 9876,
  cacheDir: process.env.CACHE_DIR || '/app/cache',
  fetchTimeout: 30000,
  maxRedirects: 5,
  logLevel: process.env.LOG_LEVEL || 'info'
};
