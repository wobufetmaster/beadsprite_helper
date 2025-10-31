#!/bin/bash

set -e

echo "🚀 Starting Beadsprite Helper development environment..."

# Check for required tools
if ! command -v uv &> /dev/null; then
    echo "❌ uv not found. Install from: https://docs.astral.sh/uv/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Install Node.js from: https://nodejs.org/"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "backend/.venv" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && uv sync && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Create logs directory
mkdir -p backend/logs

# Kill existing servers if running
echo "🔄 Checking for existing servers..."
BACKEND_PORT=8000
FRONTEND_PORT=5800

# Kill process on backend port
BACKEND_EXISTING=$(lsof -ti:$BACKEND_PORT 2>/dev/null || true)
if [ ! -z "$BACKEND_EXISTING" ]; then
    echo "   Stopping existing backend server (PID: $BACKEND_EXISTING)..."
    kill -9 $BACKEND_EXISTING 2>/dev/null || true
    sleep 1
fi

# Kill process on frontend port
FRONTEND_EXISTING=$(lsof -ti:$FRONTEND_PORT 2>/dev/null || true)
if [ ! -z "$FRONTEND_EXISTING" ]; then
    echo "   Stopping existing frontend server (PID: $FRONTEND_EXISTING)..."
    kill -9 $FRONTEND_EXISTING 2>/dev/null || true
    sleep 1
fi

echo "✅ Dependencies installed"
echo ""
echo "🎨 Frontend: http://localhost:5800"
echo "🔧 Backend:  http://localhost:8000"
echo "📝 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend
cd backend
uv run uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait
