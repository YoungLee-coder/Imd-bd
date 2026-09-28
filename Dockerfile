FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8787

ENTRYPOINT ["./docker-entrypoint.sh"]
