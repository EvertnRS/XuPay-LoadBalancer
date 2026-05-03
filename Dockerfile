FROM node:18-alpine AS builder
WORKDIR /app

# Copia manifests e instala dependências para build
COPY package*.json ./
RUN npm ci

# Copia o código e gera o build TypeScript
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# Ambiente de produção
ENV NODE_ENV=production

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copia artefatos compilados do builder
COPY --from=builder /app/dist ./dist

# Porta usada pela aplicação
EXPOSE 5500

# Comando de execução
CMD ["node", "dist/index.js"]
