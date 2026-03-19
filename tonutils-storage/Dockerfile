FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget -O tonutils-storage \
    https://github.com/xssnick/tonutils-storage/releases/latest/download/tonutils-storage-linux-amd64 \
    && chmod +x tonutils-storage

RUN mkdir -p /app/db /app/files

EXPOSE 8192

CMD ["./tonutils-storage", "--api", "0.0.0.0:8192", "--api-login", "admin", "--api-password", "secret123"]