# File Caching Server

A high-performance caching HTTP proxy server with persistent storage. Cache web responses locally and serve them instantly on subsequent requests.

## Features

- **Fast Caching**: Transparent HTTP proxy with automatic caching
- **Persistent Storage**: File-based cache survives container restarts
- **REST API**: Simple JSON API for cache management
- **Docker Ready**: Easy deployment with Docker and docker-compose
- **Production Ready**: Health checks, logging, graceful shutdown

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

### Using Docker

```bash
# Build the image
docker build -t file-caching-server .

# Run the container
docker run -d \
  -p 9876:9876 \
  -v cache-data:/app/cache \
  --name file-caching-server \
  file-caching-server

# View logs
docker logs -f file-caching-server
```

### Local Development

```bash
# Install dependencies
npm install

# Set cache directory (optional, defaults to /app/cache)
export CACHE_DIR=./cache

# Start the server
npm start
```

## API Documentation

The server listens on port **9876** by default.

### GET /GetURL

Fetch a URL through the caching proxy.

**Query Parameters:**
- `url` (required): The URL to fetch (must be http:// or https://)

**Example:**
```bash
curl "http://localhost:9876/GetURL?url=https://api.github.com/users/octocat"
```

**Behavior:**
- First request: Fetches from internet, caches, and returns content
- Subsequent requests: Returns cached content instantly
- Returns original Content-Type header
- Only caches successful responses (2xx status codes)

**Error Responses:**
```json
{
  "error": "Failed to fetch URL",
  "message": "Request timeout after 30000ms",
  "url": "https://example.com"
}
```

### GET /Contents

List all cached URLs with their sizes.

**Example:**
```bash
curl "http://localhost:9876/Contents"
```

**Response:**
```json
[
  {
    "url": "https://api.github.com/users/octocat",
    "byteSize": 1427
  },
  {
    "url": "https://example.com",
    "byteSize": 1256
  }
]
```

### GET /health

Health check endpoint for monitoring.

**Example:**
```bash
curl "http://localhost:9876/health"
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345.67,
  "cacheDir": "/app/cache",
  "port": 9876
}
```

## Configuration

Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 9876 | Server listening port |
| `CACHE_DIR` | /app/cache | Directory for cache storage |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

### Example with Custom Configuration

```bash
docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e LOG_LEVEL=debug \
  -v ~/my-cache:/app/cache \
  file-caching-server
```

## Cache Storage

The cache uses a file-based storage system:

```
/app/cache/
├── index.json              # Master index of cached URLs
└── entries/
    ├── <hash>.content     # Raw response body
    ├── <hash>.meta.json   # Metadata (headers, size, etc.)
    └── ...
```

- URLs are hashed with SHA-256 for filesystem-safe filenames
- Content and metadata stored separately for efficient listing
- Atomic writes prevent cache corruption
- Volume mounts ensure persistence across restarts

## Testing

### Manual Testing

1. **Test cache miss (first request):**
```bash
curl "http://localhost:9876/GetURL?url=https://httpbin.org/json"
# Response takes ~500ms (network latency)
```

2. **Test cache hit (second request):**
```bash
curl "http://localhost:9876/GetURL?url=https://httpbin.org/json"
# Response returns instantly (<5ms)
```

3. **Test cache listing:**
```bash
curl "http://localhost:9876/Contents"
# Shows cached URLs with byte counts
```

4. **Test persistence:**
```bash
docker-compose down
docker-compose up -d
curl "http://localhost:9876/GetURL?url=https://httpbin.org/json"
# Still cached (instant response)
```

5. **Test error handling:**
```bash
# Missing URL parameter
curl "http://localhost:9876/GetURL"

# Invalid domain
curl "http://localhost:9876/GetURL?url=https://invalid-domain-12345.com"
```

### Verification Commands

```bash
# Check cache directory contents
docker exec -it file-caching-server ls -la /app/cache/entries/

# View cache index
docker exec -it file-caching-server cat /app/cache/index.json

# Check disk usage
docker exec -it file-caching-server du -sh /app/cache/
```

## Architecture

### Technology Stack
- **Runtime**: Node.js 20 (Alpine Linux)
- **Framework**: Fastify 4 (high performance)
- **HTTP Client**: Native fetch API
- **Storage**: File system with atomic writes

### Key Design Decisions

1. **Fastify over Express**: 2-3x faster with better async support
2. **SHA-256 hashing**: Zero collision risk, handles special characters
3. **Separate metadata files**: Efficient listing without reading content
4. **Atomic writes**: Prevents corruption on crashes
5. **Non-root user**: Security best practice

### Security

- Only http:// and https:// protocols allowed (prevents SSRF)
- Runs as non-root user (node) in container
- URL validation before fetching
- Timeout protection (30 seconds)
- Error responses don't expose system internals

## Monitoring

### Health Checks

Docker health checks run every 30 seconds:
```bash
# Check container health
docker ps

# View health check logs
docker inspect file-caching-server | grep -A 10 Health
```

### Logs

View server logs:
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f file-caching-server
```

Log entries include:
- Cache hits/misses
- Fetch operations
- Errors with context
- Startup/shutdown events

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs file-caching-server

# Common issues:
# - Port 9876 already in use: Change PORT environment variable
# - Permission issues: Check volume permissions
```

### Cache not persisting
```bash
# Verify volume is mounted
docker inspect file-caching-server | grep Mounts

# Check volume contents
docker volume inspect cache-data
```

### Slow responses
```bash
# Check if actually caching
docker logs file-caching-server | grep "Cache HIT"

# Verify cache files exist
docker exec file-caching-server ls /app/cache/entries/
```

## Development

### Project Structure

```
FileCachingServer/
├── src/
│   ├── server.js              # Main entry point
│   ├── config/
│   │   └── index.js          # Configuration management
│   ├── routes/
│   │   ├── geturl.js         # GET /GetURL handler
│   │   └── contents.js       # GET /Contents handler
│   └── services/
│       ├── cache.js          # Cache CRUD operations
│       ├── fetcher.js        # HTTP client
│       └── hasher.js         # URL hashing
├── Dockerfile                 # Container image
├── docker-compose.yml         # Orchestration
└── package.json              # Dependencies
```

### Adding Features

The codebase is modular and easy to extend:
- Add routes in `src/routes/`
- Add services in `src/services/`
- Configuration in `src/config/index.js`

## License

MIT
