# Smart Warehouse System

This repository contains a warehouse management system with:

- a React + TypeScript + Vite frontend in `frontend/`
- a Node.js + Express + Prisma backend in `real-time-inventory-system-main/backend/`
- a FastAPI-based PaddleOCR service in `ocr-service/`
- a Docker production deployment setup for Tencent Cloud Lighthouse

## Current Status

The project is no longer frontend-only.

Current live capabilities include:

- register and login with a real backend
- dashboard and operational UI
- products, warehouses, inventory, inbounds, outbounds, approvals, and users APIs
- OCR document upload, detection, extraction, and template workflows
- Docker-based production deployment with PostgreSQL

## Project Structure

- `frontend/`: main frontend app
- `real-time-inventory-system-main/backend/`: backend service
- `ocr-service/`: PaddleOCR microservice used by the backend OCR module
- `docker-compose.prod.yml`: production Docker compose file
- `.env.production.example`: production environment template
- `docs/tencent-cloud-docker-deploy.md`: deployment notes

## Local Development

### Run the backend

```bash
cd real-time-inventory-system-main/backend
npm install
docker compose up -d
npm run dev
```

Backend URLs:

- `http://localhost:4000/health`
- `http://localhost:4000/api-docs/`

### Run the OCR service

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build ocr-service
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f ocr-service
```

Notes:

- `ocr-service` defaults to `linux/amd64`. This avoids known ARM64 PaddleOCR runtime crashes on Apple Silicon and other aarch64 Docker hosts.
- The first OCR request downloads PaddleOCR model files, so the initial response is slower than later requests.

OCR health check from inside the container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T ocr-service \
  python - <<'PY'
import urllib.request
print(urllib.request.urlopen('http://127.0.0.1:8001/health').read().decode())
PY
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Then open the local address shown in the terminal.

## Production Deployment

This project is prepared for Docker deployment on Tencent Cloud Lighthouse.

### 1. Prepare production env

Create a production env file from the template:

```bash
cp .env.production.example .env.production
```

Update these values before deployment:

```env
POSTGRES_DB=inventory_db
POSTGRES_USER=inventory_admin
POSTGRES_PASSWORD=replace_with_a_strong_password
JWT_SECRET=replace_with_a_long_random_secret
VITE_API_BASE_URL=/api
OCR_PLATFORM=linux/amd64
```

### 2. Upload the project to the server

Example:

```bash
rsync -az --delete --exclude .git --exclude node_modules --exclude dist --exclude .DS_Store /Users/liuzeyu/smart-warehouse-system/ root@111.229.239.137:/root/smart-warehouse-system/
```

### 3. Start or rebuild the production stack

```bash
ssh root@111.229.239.137
cd /root/smart-warehouse-system
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

### 4. Check service status

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs backend --tail 100
docker compose --env-file .env.production -f docker-compose.prod.yml logs frontend --tail 100
docker compose --env-file .env.production -f docker-compose.prod.yml logs postgres --tail 100
docker compose --env-file .env.production -f docker-compose.prod.yml logs ocr-service --tail 100
```

### 5. Production access

- Frontend: `http://111.229.239.137`
- Login page: `http://111.229.239.137/#/login`
- API docs: `http://111.229.239.137/api-docs/`
- Health check: `http://111.229.239.137/health`

## Production Update Workflow

After local code changes, update the server with:

```bash
rsync -az --delete --exclude .git --exclude node_modules --exclude dist --exclude .DS_Store /Users/liuzeyu/smart-warehouse-system/ root@111.229.239.137:/root/smart-warehouse-system/
```

```bash
ssh root@111.229.239.137
cd /root/smart-warehouse-system
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Useful follow-up commands:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs backend --tail 100
docker compose --env-file .env.production -f docker-compose.prod.yml restart backend
```

## First-Time Admin Setup

If the production database is empty, create the first admin account after deployment:

```bash
curl -X POST http://127.0.0.1/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@northline.com","password":"admin123","name":"Northline Admin","role":"ADMIN"}'
```

## Notes

- The server deployment currently uses Docker, Nginx, Node.js, and PostgreSQL.
- Domain and HTTPS can be added later without changing the main application structure.
- For more deployment detail, see `docs/tencent-cloud-docker-deploy.md`.
