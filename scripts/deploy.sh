#!/bin/bash
set -e

echo "=== ViHAT Knowledge System - Deploy ==="

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Build and restart
echo "Building Docker images..."
docker compose build

echo "Running database migrations..."
docker compose up -d postgres redis
sleep 5
docker compose exec api alembic upgrade head

echo "Starting all services..."
docker compose up -d

echo "Waiting for services to start..."
sleep 5

# Health check
echo "Running health check..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Health check passed!"
else
    echo "Health check FAILED (HTTP $HTTP_STATUS)"
    docker compose logs api --tail=50
    exit 1
fi

echo "=== Deploy complete ==="
