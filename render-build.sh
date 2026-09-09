#!/usr/bin/env bash
# Render Build Command Script for TraceXData API
set -e

echo "==> [RENDER BUILD] Installing Python requirements..."
pip install -r requirements.txt

echo "==> [RENDER BUILD] Installing Node dependencies..."
npm install --no-audit --no-fund

echo "==> [RENDER BUILD] Building frontend and backend bundle..."
npm run build

echo "==> [RENDER BUILD] All dependencies installed and bundles compiled successfully!"
