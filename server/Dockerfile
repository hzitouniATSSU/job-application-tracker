FROM node:24-bookworm-slim

WORKDIR /app

# Prisma requires OpenSSL
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests plus Prisma files BEFORE npm ci,
# because npm ci runs "postinstall": "prisma generate"
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

# Copy application source
COPY . .

# postinstall already generates Prisma Client, but running this
# explicitly ensures generation matches the final source tree.
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
