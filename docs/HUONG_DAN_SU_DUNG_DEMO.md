# Hướng dẫn sử dụng và chạy demo KhaUniSent

Tài liệu này mô tả cách cài đặt và chạy demo hệ thống KhaUniSent từ mã nguồn trong thư mục `src`.

## 1. Yêu cầu môi trường

- Python 3.10 hoặc 3.11
- Node.js 18+
- Git
- Tài khoản Apify và `APIFY_API_TOKEN`
- Model PhoBERT fine-tuned đã train xong

## 2. Cấu trúc source dùng để demo

```text
src/
├── backend/        # FastAPI, crawler, preprocessing, inference PhoBERT
├── frontend/       # ReactJS + Vite dashboard
├── scripts/        # Script benchmark, so sánh Gemini, train/phụ trợ
├── data/           # Dataset final và tập evaluation
├── notebooks/      # Notebook fine-tune PhoBERT
└── models/         # README hướng dẫn đặt model, không chứa weight lớn
```

## 3. Cấu hình biến môi trường

Từ thư mục `src`, tạo file `.env` từ mẫu:

```powershell
cd src
copy .env.example .env
```

Mở file `.env` và điền:

```env
APIFY_API_TOKEN=apify_api_xxx
GEMINI_API_KEY=          # tùy chọn, chỉ dùng cho trang so sánh
GEMINI_MODEL=gemini-1.5-flash
PHOBERT_MODEL_PATH=./models/phobert-sentiment-continued
VNCORENLP_PATH=./models/vncorenlp
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_API_URL=http://127.0.0.1:8000
```

Lưu ý: model fine-tuned không đưa trực tiếp lên GitHub do dung lượng lớn. Cần đặt model tại:

```text
src/models/phobert-sentiment-continued/
├── config.json
├── model.safetensors hoặc pytorch_model.bin
├── tokenizer_config.json
├── vocab.txt
├── bpe.codes
└── training_metadata.json
```

## 4. Chạy Backend FastAPI

```powershell
cd src
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Kiểm tra backend:

```text
http://127.0.0.1:8000/health
```

Nếu `model_loaded = true`, backend đã gọi được PhoBERT fine-tuned.

## 5. Chạy Frontend ReactJS

Mở terminal thứ hai:

```powershell
cd src\frontend
npm install
npm run dev
```

Truy cập:

```text
http://127.0.0.1:5173
```

## 6. Luồng demo đề xuất khi bảo vệ

1. Mở trang Tổng quan để kiểm tra trạng thái backend, model, Apify.
2. Vào trang Test model, nhập một bình luận tiếng Việt bất kỳ để chứng minh PhoBERT inference trực tiếp.
3. Vào trang Phân tích video, dán URL TikTok và chọn số bình luận cần phân tích.
4. Vào trang Phân tích kênh, nhập username kênh và giới hạn số video/comment.
5. Mở trang So sánh Gemini để đối chiếu kết quả PhoBERT với Gemini trên một số mẫu ngắn.
6. Mở thư mục `docs/figures/performance` để trình bày biểu đồ đánh giá thời gian xử lý.

## 7. API chính

```text
GET  /health
POST /analyze/comment
POST /analyze/video
POST /analyze/channel
POST /compare/gemini
```

Response chuẩn:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## 8. Lỗi thường gặp

- `Thiếu APIFY_API_TOKEN`: kiểm tra file `.env` và token Apify.
- `Model chưa sẵn sàng`: kiểm tra `PHOBERT_MODEL_PATH` và thư mục model.
- Frontend không kết nối backend: kiểm tra backend đang chạy ở cổng `8000` và `VITE_API_URL` là `http://127.0.0.1:8000`.
- Crawl TikTok chậm: thời gian phụ thuộc Apify, quota, trạng thái TikTok và số lượng video/comment yêu cầu.
