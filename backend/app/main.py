import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import meetings, auth
from app.core.config import settings
from app.db.database import engine, Base
import time
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- DATABASE INITIALIZATION ---
logger.info("Initializing database tables...")
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check EC2 logs."},
    )

# Request logging middleware with Header Debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Debug info for CORS/Proxy issues
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    logger.info(f"{method} {path} | Status: {response.status_code} | Origin: {origin} | Time: {process_time:.2f}ms")
    return response

# --- BULLETPROOF CORS CONFIGURATION ---
# We load allowed origins from settings (configurable via environment variables)
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "ngrok-skip-browser-warning",
    ],
    expose_headers=["*"],
    max_age=6000, # Cache preflight for 10 minutes
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "app": settings.APP_NAME,
        "environment": "production" if not settings.DEBUG else "development"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
