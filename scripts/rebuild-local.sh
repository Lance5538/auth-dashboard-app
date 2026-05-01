#!/usr/bin/env sh
set -eu

APP_RELEASE_VERSION="${APP_RELEASE_VERSION:-ocr-rule-library-20260501}"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || printf local)"
DIRTY_MARKER=""
if [ -n "$(git status --short 2>/dev/null || true)" ]; then
  DIRTY_MARKER="-dirty"
fi

APP_VERSION="${APP_VERSION:-${APP_RELEASE_VERSION}-${GIT_SHA}${DIRTY_MARKER}}"
export APP_VERSION

if [ "${1:-}" = "--with-ocr" ]; then
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
  exit 0
fi

docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres ocr-service
docker compose --env-file .env.production -f docker-compose.prod.yml build backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend
