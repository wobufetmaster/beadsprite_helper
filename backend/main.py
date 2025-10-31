import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.logging_config import setup_logging

# Configure logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Beadsprite Helper API")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Beadsprite Helper API starting up")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Beadsprite Helper API shutting down")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Beadsprite Helper API"}

@app.get("/health")
async def health():
    logger.debug("Health check endpoint accessed")
    return {"status": "healthy"}
