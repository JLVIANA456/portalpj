# Estágio 1: build + compilação dos módulos nativos
FROM node:22-bookworm-slim AS build
WORKDIR /app

# libxml2-dev + ferramentas de compilação (necessário para libxmljs2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies mantendo os node_modules nativos já compilados
RUN npm prune --omit=dev

# Estágio 2: imagem final enxuta
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Apenas o runtime do libxml2 (sem ferramentas de build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

# Copia node_modules já compilados do estágio de build (evita recompilar)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY assets ./assets

# Garante que o usuário node pode escrever no diretório de cache de schemas XSD
RUN mkdir -p /app/.cache && chown -R node:node /app

USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
