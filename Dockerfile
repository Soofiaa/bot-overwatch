FROM node:22-slim

WORKDIR /app

# Instala solo las dependencias de producción a partir del lock file
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY assets ./assets

CMD ["node", "src/index.js"]
