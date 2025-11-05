# Cài đặt Ollama bằng Docker

## Nếu bạn có Docker Desktop

### Bước 1: Chạy Ollama container
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### Bước 2: Cài đặt model
```bash
docker exec -it ollama ollama pull llama3.2:3b
```

### Bước 3: Kiểm tra
Truy cập: http://localhost:11434/api/tags

## Lợi ích Docker
- ✅ Không cần cài đặt Ollama trực tiếp
- ✅ Dễ dàng quản lý và cập nhật
- ✅ Tách biệt với hệ thống chính
- ✅ Có thể dừng/khởi động dễ dàng

## Quản lý container
```bash
# Dừng Ollama
docker stop ollama

# Khởi động Ollama
docker start ollama

# Xem logs
docker logs ollama

# Xóa container
docker rm ollama
```

