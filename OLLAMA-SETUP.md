# Hướng dẫn cài đặt Ollama cho Windows

## Lỗi hiện tại
```
Ollama error: request to http://localhost:11434/api/generate failed, reason:
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## Nguyên nhân
Ollama chưa được cài đặt hoặc chưa chạy trên máy Windows.

## Giải pháp

### Bước 1: Tải và cài đặt Ollama
1. Truy cập: https://ollama.com
2. Click "Download for Windows"
3. Tải file installer về máy
4. Chạy installer và làm theo hướng dẫn

### Bước 2: Khởi động Ollama
Sau khi cài đặt xong, mở Command Prompt hoặc PowerShell và chạy:
```bash
ollama serve
```

### Bước 3: Cài đặt model AI
```bash
# Model khuyến nghị (cân bằng tốc độ và chất lượng)
ollama pull llama3.2:3b

# Model nhanh hơn (nhỏ hơn)
ollama pull llama3.2:1b

# Model chất lượng cao
ollama pull mistral:7b
```

### Bước 4: Kiểm tra Ollama hoạt động
Mở trình duyệt và truy cập: http://localhost:11434/api/tags

Nếu thấy JSON response, Ollama đã hoạt động.

## Fallback hiện tại
Hiện tại ChatAI đã được cấu hình để:
1. **Ưu tiên Ollama** - Nếu Ollama chạy, sẽ sử dụng Ollama
2. **Fallback OpenRouter** - Nếu Ollama không chạy, sẽ tự động chuyển sang OpenRouter

## Cách sử dụng
1. Vào **Messages** → **ChatAI**
2. ChatAI sẽ tự động chọn backend phù hợp
3. Nếu muốn dùng Ollama, hãy cài đặt theo hướng dẫn trên

## Lợi ích của Ollama
- ✅ **Miễn phí** - Không cần API key
- ✅ **Local** - Dữ liệu không rời khỏi máy
- ✅ **Nhanh** - Không phụ thuộc internet
- ✅ **Riêng tư** - Hoàn toàn offline

## Troubleshooting

### Lỗi "ollama not found"
- Đảm bảo Ollama đã được cài đặt
- Thêm Ollama vào PATH environment variable
- Khởi động lại terminal

### Lỗi "connection refused"
- Chạy `ollama serve` trước
- Kiểm tra port 11434 có bị block không
- Thử restart Ollama service

### Lỗi "model not found"
- Cài đặt model: `ollama pull <model-name>`
- Kiểm tra model có sẵn: `ollama list`

## Liên hệ hỗ trợ
Nếu gặp vấn đề, hãy:
1. Kiểm tra log trong browser console
2. Kiểm tra Ollama service status
3. Thử restart cả Ollama và ứng dụng

