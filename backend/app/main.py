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
        content={"detail": "Internal server error. Check EC2 journalctl logs."},
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # DEBUG LOGS FOR PROXY/CORS
    origin = request.headers.get("origin")
    auth_header = request.headers.get("authorization")
    forwarded_proto = request.headers.get("x-forwarded-proto")
    
    logger.info(f"INCOMING REQUEST: {request.method} {request.url.path}")
    logger.info(f"HEADERS: Origin={origin} | Auth={auth_header[:15] if auth_header else 'None'}... | Proto={forwarded_proto}")

    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    logger.info(f"RESPONSE: Status: {response.status_code} | Time: {process_time:.2f}ms")
    return response

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://meetingapp-two.vercel.app",
        "https://meetingmind.vercel.app",
        "https://d233h9ny7ketsg.cloudfront.net",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "environment": "production" if not settings.DEBUG else "development"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
