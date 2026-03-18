#!/bin/bash
set -e

echo "=== Dify Setup Script for ViHAT ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in, then re-run this script."
    exit 0
fi

# Clone Dify if not already
DIFY_DIR="$HOME/dify"
if [ ! -d "$DIFY_DIR" ]; then
    echo "Cloning Dify..."
    git clone https://github.com/langgenius/dify.git "$DIFY_DIR"
fi

cd "$DIFY_DIR/docker"

# Setup env
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    # Generate secret key
    SECRET=$(openssl rand -hex 32)
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET/" .env
    echo "Please edit .env to configure:"
    echo "  - CONSOLE_WEB_URL"
    echo "  - APP_WEB_URL"
    echo "  - Any API keys"
fi

# Copy override if available
OVERRIDE_SRC="$(dirname "$0")/../config/dify/docker-compose.override.yml"
if [ -f "$OVERRIDE_SRC" ]; then
    cp "$OVERRIDE_SRC" ./docker-compose.override.yml
    echo "Copied docker-compose.override.yml"
fi

echo "Starting Dify..."
docker compose up -d

echo "Waiting for Dify to start..."
sleep 30

echo "Dify should be available at http://localhost:80"
echo "=== Dify setup complete ==="
