#!/bin/bash
# Deploy script for production
# Usage: ./scripts/deploy.sh [main|develop]

set -e

BRANCH="${1:-main}"
ENVIRONMENT="${2:-production}"

echo "🚀 Starting deployment from branch: $BRANCH"
echo "📦 Environment: $ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on the right branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Currently on $CURRENT_BRANCH, switching to $BRANCH${NC}"
    git checkout $BRANCH
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin $BRANCH

# Verify .env files exist
echo -e "${YELLOW}🔍 Checking environment files...${NC}"
if [ ! -f "talki-backend/.env.${ENVIRONMENT}" ]; then
    echo -e "${RED}❌ Error: talki-backend/.env.${ENVIRONMENT} not found${NC}"
    exit 1
fi

if [ ! -f "frontend/.env.${ENVIRONMENT}" ]; then
    echo -e "${RED}❌ Error: frontend/.env.${ENVIRONMENT} not found${NC}"
    exit 1
fi

# Check secrets
if [ ! -f "secrets/google-credentials.json" ]; then
    echo -e "${RED}❌ Error: secrets/google-credentials.json not found${NC}"
    echo "Please add your Google credentials to secrets/google-credentials.json"
    exit 1
fi

COMPOSE_ENV_FLAGS=(--env-file "talki-backend/.env.${ENVIRONMENT}" --env-file "frontend/.env.${ENVIRONMENT}")

# Stop existing containers (if any)
echo -e "${YELLOW}⛔ Stopping existing containers...${NC}"
docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml down 2>/dev/null || true

# Build new images
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml build

# Start containers
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Backend health check
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml logs backend
    exit 1
fi

# Frontend health check
if curl -f http://localhost:5173 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml logs frontend
    exit 1
fi

# Display logs
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker-compose "${COMPOSE_ENV_FLAGS[@]}" -f docker-compose.${ENVIRONMENT}.yml logs --tail=20

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Services are running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000"
echo "  Nginx: http://localhost"
echo ""
echo "View logs: docker-compose --env-file talki-backend/.env.${ENVIRONMENT} --env-file frontend/.env.${ENVIRONMENT} -f docker-compose.${ENVIRONMENT}.yml logs -f"
echo "Stop services: docker-compose --env-file talki-backend/.env.${ENVIRONMENT} --env-file frontend/.env.${ENVIRONMENT} -f docker-compose.${ENVIRONMENT}.yml down"
