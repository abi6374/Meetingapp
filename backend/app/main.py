from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import meetings, auth
from app.core.config import settings
from app.db.database import engine, Base
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- DATABASE INITIALIZATION ---
# Create tables automatically on startup (Safe for SQLite)
logger.info("Initializing database tables...")
Base.metadata.create_all(bind=engine)
# -------------------------------

app = FastAPI(title=settings.APP_NAME)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}ms".format(process_time)
    logger.info(f"RID: {request.headers.get('X-Process-Time')} | {request.method} {request.url.path} | Status: {response.status_code} | Time: {formatted_process_time}")
    return response

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://meetingapp-two.vercel.app", # User's live Vercel frontend
        "https://meetingmind.vercel.app", 
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
