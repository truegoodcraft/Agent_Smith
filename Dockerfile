# Dockerfile for Agent Smith — Ollama Discord Bot Bridge
# Multi-stage build to keep the final image small.

FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Non-root user for security
RUN useradd -m botuser && chown -R botuser /app
USER botuser

# Run the bot
CMD ["python", "main.py"]
