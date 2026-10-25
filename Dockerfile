# Imagen de DESARROLLO LOCAL únicamente (ver docker-compose.local.yml).
# No es la imagen de despliegue: en producción Render construye directamente
# desde el repo con el Build/Start Command del dashboard (ver render.yaml y
# docs/cutover-runbook.md). Node 24 (Debian, no alpine) para evitar problemas
# de binarios nativos con `argon2`.
FROM node:24-bookworm

WORKDIR /app

# Capa de dependencias cacheada aparte del código fuente: mientras no cambien
# package*.json, `npm ci` no se vuelve a ejecutar en rebuilds.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# docker-compose.local.yml monta el código como volumen y sobreescribe este
# CMD si hace falta; watch mode para recompilar al vuelo.
CMD ["npm", "run", "start:dev"]
