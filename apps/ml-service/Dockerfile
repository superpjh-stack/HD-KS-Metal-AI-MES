# ── Build stage ───────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runtime stage ─────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Model storage mount point
RUN mkdir -p /models

EXPOSE 3007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3007"]
