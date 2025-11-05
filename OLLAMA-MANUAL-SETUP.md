# Hướng dẫn cài đặt Ollama thủ công

## Vấn đề hiện tại
ChatAI chỉ sử dụng Ollama và không có fallback. Cần cài đặt Ollama để sử dụng.

## Cách cài đặt Ollama

### Bước 1: Tải Ollama
1. Mở trình duyệt và truy cập: **https://ollama.com**
2. Click **"Download for Windows"**
3. Tải file installer về máy

### Bước 2: Cài đặt
1. Chạy file installer vừa tải
2. Làm theo hướng dẫn cài đặt
3. Đảm bảo Ollama được thêm vào PATH

### Bước 3: Khởi động Ollama
Mở Command Prompt hoặc PowerShell và chạy:
```bash
ollama serve
```

### Bước 4: Cài đặt model AI
Trong terminal mới, chạy:
```bash
# Model khuyến nghị
ollama pull llama3.2:3b

# Hoặc model nhỏ hơn (nhanh hơn)
ollama pull llama3.2:1b
```

### Bước 5: Kiểm tra
Mở trình duyệt và truy cập: **http://localhost:11434/api/tags**

Nếu thấy JSON response, Ollama đã hoạt động.

## Sử dụng ChatAI
1. Vào **Messages** → **ChatAI**
2. ChatAI sẽ sử dụng Ollama
3. Có thể chọn model và điều chỉnh settings

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

## Lợi ích của Ollama
- ✅ **Miễn phí** - Không cần API key
- ✅ **Local** - Dữ liệu không rời khỏi máy
- ✅ **Nhanh** - Không phụ thuộc internet
- ✅ **Riêng tư** - Hoàn toàn offline
- ✅ **Nhiều model** - Llama, Mistral, Phi-3, Gemma, Qwen

## Models khuyến nghị
- **llama3.2:3b** - Cân bằng tốc độ và chất lượng
- **llama3.2:1b** - Nhanh, nhỏ
- **mistral:7b** - Chất lượng cao
- **phi3:mini** - Microsoft
- **gemma:2b** - Google
- **qwen2.5:3b** - Alibaba

