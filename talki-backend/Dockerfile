FROM python:3.12-slim

WORKDIR /app

# Cài deps trước (tận dụng Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (sẽ bị override bởi volume mount khi dev)
COPY . .

EXPOSE 8000

# --reload để hot-reload khi file thay đổi
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
