FROM node:22-alpine

WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy server source
COPY server/ ./server/
COPY tsconfig.json ./

# Expose port
EXPOSE 3000

# Run with tsx for TypeScript support
CMD ["npx", "tsx", "server/index.ts"]
