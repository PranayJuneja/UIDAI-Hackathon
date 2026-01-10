# Use Python 3.10 slim image for smaller size
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing pyc files to disc
# PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (if any are needed for Polars/Numpy)
# build-essential is often needed for compiling some python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
# Using --no-cache-dir to keep image small
# Installing CPU-only version of torch to save massive amounts of space (2GB+ saved)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
# We use .dockerignore to exclude venv, frontend, etc.
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
# Using shell form to allow variable expansion for PORT (required by Render/Heroku)
CMD sh -c "uvicorn api_server:app --host 0.0.0.0 --port ${PORT:-8000}"
