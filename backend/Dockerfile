FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (FFmpeg is critical for Pyannote/Torchcodec)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create data directory for SQLite persistence
RUN mkdir -p /data && chmod 777 /data

# Copy the rest of the application
COPY . .

# Run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
