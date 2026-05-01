FROM node:20-alpine

WORKDIR /app

ARG APP_VERSION=local
ENV APP_VERSION=${APP_VERSION}

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci && npx prisma generate

COPY openapi.yaml ./openapi.yaml
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > ./build-time.txt \
  && chmod +x ./docker-entrypoint.sh \
  && npm run build

EXPOSE 4000

CMD ["./docker-entrypoint.sh"]
