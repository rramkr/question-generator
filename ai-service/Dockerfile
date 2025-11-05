FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Expose port
EXPOSE 5002

# Set environment variables
ENV PORT=5002
ENV OLLAMA_API=http://localhost:11434

# Run the application
CMD ["python", "app.py"]
