# Backend Docker image for Fly.io
# Stage 1: Copy SRS binary from official image
FROM ossrs/srs:5 AS srs

# Stage 2: Node.js app
FROM node:20

WORKDIR /app

# Install runtime dependencies for SRS + ffmpeg for browser ingest
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy SRS from stage 1
COPY --from=srs /usr/local/srs /usr/local/srs

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy backend source and build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc --outDir dist

# Copy SQL migration files (tsc doesn't copy non-TS files)
RUN mkdir -p dist/migrations && cp src/migrations/*.sql dist/migrations/

# Remove dev deps after build to reduce image size
RUN npm prune --production

# Copy SRS config
COPY srs.conf /app/srs.conf

# Create startup script
RUN printf '%s\n' \
    '#!/bin/bash' \
    'mkdir -p /tmp/srs/hls /app/objs' \
    '/usr/local/srs/objs/srs -c /app/srs.conf &' \
    'SRS_PID=$!' \
    'sleep 2' \
    'node dist/server.js' \
    'kill $SRS_PID 2>/dev/null' \
    > /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000 1935

ENV PORT=3000
ENV NODE_ENV=production

CMD ["/app/start.sh"]
