# TikUniSent System Architecture

## Mermaid Diagram

```mermaid
flowchart TD
  %% =========================
  %% TANG 1
  %% =========================
  subgraph L1["TANG 1 - USER & PRESENTATION LAYER"]
    U["Nguoi dung<br/>Giang vien / Sinh vien"]
    Browser["Web Browser<br/>http://localhost:5173"]
    FE["Frontend ReactJS 18 + Vite<br/>TailwindCSS, React Router, Axios, Recharts"]
    Pages["Pages<br/>/ , /model-test, /video, /channel,<br/>/labeling, /history, /settings"]
    UI["Visualization<br/>KPI cards, donut chart, bar chart,<br/>comment table, history detail"]
  end

  %% =========================
  %% TANG 2
  %% =========================
  subgraph L2["TANG 2 - BACKEND API LAYER"]
    API["FastAPI + Uvicorn<br/>http://localhost:8000<br/>CORS + dotenv"]
    Contract["Response contract<br/>{ success, data, error }"]
    Endpoints["REST Endpoints<br/>GET /health, /stats<br/>POST /analyze/comment<br/>POST /analyze/video<br/>POST /analyze/channel<br/>GET/POST /labeling/*"]
    Config["Security & Config<br/>APIFY_API_TOKEN<br/>PHOBERT_MODEL_PATH<br/>VNCORENLP_PATH<br/>CORS_ORIGINS, API_PORT"]
    Health["Model Health<br/>model_loaded, device,<br/>model_path, metrics"]
  end

  %% =========================
  %% TANG 3
  %% =========================
  subgraph L3["TANG 3 - BUSINESS SERVICE LAYER"]
    Crawler["1. Crawler Service<br/>crawl_video_details()<br/>crawl_channel_comments()<br/>raw TikTok JSON"]
    Pre["2. Preprocessing Service<br/>10 buoc lam sach<br/>@tag, URL, phone, HTML,<br/>repeat, noise, spaces,<br/>emoji-only, length, duplicate"]
    Sentiment["3. Sentiment Service<br/>cleaned text<br/>PhoBERT tokenize max 256<br/>PhoBERT inference<br/>Softmax -> label + confidence"]
    Aggregate["4. Aggregation Service<br/>summarize comments<br/>video sentiment ratio<br/>channel overall stats<br/>JSON response"]
    Labeling["Labeling Service<br/>build queue, PhoBERT suggestion,<br/>manual review, merge master,<br/>export train dataset"]
  end

  %% =========================
  %% TANG 4
  %% =========================
  subgraph L4["TANG 4 - AI MODEL & DATA LAYER"]
    Apify["Apify External API<br/>clockworks/tiktok-scraper<br/>clockworks/tiktok-comments-scraper<br/>Auth: APIFY_API_TOKEN"]
    PhoBERT["PhoBERT Fine-tuned Model<br/>Base: vinai/phobert-base<br/>Classifier: Linear 768 -> 3<br/>positive / negative / neutral"]
    ModelFiles["Model files<br/>pytorch_model.bin or model.safetensors<br/>config.json, tokenizer files<br/>training_metadata.json"]
    Data["Dataset & Labels<br/>data/tong_hop_comment.json<br/>data/raw, data/processed, data/labeled<br/>manual train export, backups"]
    Gemini["Gemini API<br/>DEPRECATED / khong thuoc luong chinh<br/>chi nen de so sanh offline neu can"]
  end

  U --> Browser --> FE --> Pages --> UI
  FE -- "Axios HTTP" --> API
  API --> Contract --> Endpoints
  Endpoints --> Config
  Endpoints --> Health

  Endpoints -- "analyze video/channel" --> Crawler
  Endpoints -- "analyze comment" --> Sentiment
  Endpoints -- "labeling APIs" --> Labeling

  Crawler -- "call actors" --> Apify
  Apify -- "raw videos/comments" --> Crawler
  Crawler --> Pre --> Sentiment --> Aggregate
  Sentiment --> PhoBERT
  PhoBERT --> ModelFiles
  Aggregate -- "success/data/error" --> API
  API -- "JSON response" --> FE

  Labeling --> Pre
  Labeling --> Sentiment
  Labeling --> Data
  Data -- "stats / label queue / train export" --> Endpoints
  Gemini -. "deprecated, not production inference" .- Sentiment

  classDef frontend fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
  classDef backend fill:#dcfce7,stroke:#16a34a,color:#14532d;
  classDef service fill:#f3e8ff,stroke:#9333ea,color:#581c87;
  classDef model fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;
  classDef external fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
  classDef data fill:#f8fafc,stroke:#64748b,color:#334155;

  class U,Browser,FE,Pages,UI frontend;
  class API,Contract,Endpoints,Config,Health backend;
  class Crawler,Pre,Sentiment,Aggregate,Labeling service;
  class PhoBERT,ModelFiles model;
  class Apify,Gemini external;
  class Data data;
```

## Component Description

| Layer | Component | Current Implementation | Responsibility |
|---|---|---|---|
| User & Presentation | Browser | `http://localhost:5173` | Người dùng truy cập hệ thống qua trình duyệt. |
| User & Presentation | Frontend | React 18, Vite, TailwindCSS, React Router, Axios, Recharts | Gửi request, nhận response, hiển thị KPI, biểu đồ, bảng comment và lịch sử. |
| User & Presentation | Pages | `/`, `/model-test`, `/video`, `/channel`, `/labeling`, `/history`, `/settings` | Các màn hình nghiệp vụ hiện có trong frontend. |
| Backend API | FastAPI app | `backend/main.py` | Định nghĩa API, CORS, error handler, startup load model. |
| Backend API | Response contract | `backend/app/utils/response.py` | Chuẩn hóa response `{ success, data, error }`. |
| Backend API | Health check | `GET /health` | Trả trạng thái model, device, model path, metric metadata và trạng thái Apify. |
| Business Service | Crawler Service | `backend/crawler.py` | Gọi Apify để crawl video, channel và comment TikTok. |
| Business Service | Preprocessing Service | `backend/preprocessing.py`, `modules/text_preprocessor.py` | Làm sạch text, loại comment không phù hợp cho gán nhãn hoặc inference. |
| Business Service | Sentiment Service | `backend/sentiment.py` | Load PhoBERT fine-tuned, tokenize, inference, softmax, trả label/confidence. |
| Business Service | Aggregation Service | `summarize()` trong `backend/sentiment.py`, logic trong `backend/main.py` | Tổng hợp sentiment theo video và theo kênh. |
| Business Service | Labeling Service | `backend/labeling_store.py` | Tạo queue, gợi ý bằng PhoBERT, lưu nhãn thủ công, merge master, export train. |
| AI & Data | PhoBERT fine-tuned | `PHOBERT_MODEL_PATH`, fallback `models/` | Model chính duy nhất cho luồng phân tích production. |
| AI & Data | Apify API | `clockworks/tiktok-scraper`, `clockworks/tiktok-comments-scraper` | Nguồn crawl dữ liệu TikTok. |
| AI & Data | Dataset | `data/tong_hop_comment.json`, `data/labeled/*`, `data/backup/*` | Lưu dữ liệu master, queue gán nhãn, train export và backup. |
| AI & Data | Gemini | Còn code import/init nhưng bị chặn trong API phân tích | Nên đánh dấu deprecated hoặc xóa khỏi runtime chính. |

## Main Data Flows

| Flow | Steps | Output |
|---|---|---|
| Analyze one comment | Frontend `/model-test` -> `POST /analyze/comment` -> PhoBERT tokenize/inference -> softmax | `{ sentiment, confidence, scores, text_clean }` |
| Analyze video | Frontend `/video` -> `POST /analyze/video` -> Apify comments scraper -> preprocess/inference -> summarize | Video title, sentiment summary, details per comment |
| Analyze channel | Frontend `/channel` -> `POST /analyze/channel` -> Apify video scraper -> comments per video -> per-video inference -> channel aggregation | Channel info, overall summary, video list, per-video details |
| Label new comments | Frontend `/labeling` -> `GET /labeling/queue` -> preprocess unlabeled comments -> PhoBERT prelabel -> manual review | Label queue with suggested labels |
| Merge labels to train | Frontend `/labeling` -> `POST /labeling/queue/merge-master` -> update `tong_hop_comment.json` -> export manual train file | Updated master dataset and `phobert_retrain_manual_master.json` |
| Dashboard stats | Frontend overview -> `GET /stats` -> read `data/tong_hop_comment.json` | KPI totals and positive percentage |

## Architecture Audit Against Current Code

### ✅ Đúng với kiến trúc

| Item | Evidence |
|---|---|
| Backend dùng FastAPI + CORS + dotenv | `backend/main.py` |
| Response chuẩn `{ success, data, error }` | `success_response`, `error_response` trong `backend/app/utils/response.py` |
| Có `/health`, `/stats`, `/analyze/video`, `/analyze/channel`, `/analyze/comment`, `/labeling/*` | `backend/main.py` |
| Frontend dùng React 18 + Vite + Axios + Router + Recharts | `frontend/package.json`, `frontend/src/App.jsx`, `frontend/src/services/api.js` |
| Apify token được resolve ở backend | `resolve_apify_token()` trong `backend/main.py` |
| PhoBERT là luồng inference chính | `backend/sentiment.py`, `analyze_batch()` luôn gọi `_predict_phobert()` |
| API phân tích chặn `model='gemini'` | `/analyze/video`, `/analyze/channel`, `/analyze/comment` trong `backend/main.py` |
| Có labeling queue, prelabel, merge master, export train | `backend/labeling_store.py` |
| Constants 3 nhãn và màu sắc thống nhất | `backend/app/core/constants.py`, `frontend/src/utils/constants.js` |

### ⚠️ Cần điều chỉnh

| Item | Lý do | Cách chỉnh |
|---|---|---|
| Frontend route tổng quan là `/`, không phải `/overview` | Yêu cầu kiến trúc ghi `/overview`; code hiện dùng `/` | Thêm route alias `/overview` trỏ về `OverviewPage`, hoặc sửa tài liệu thành `/`. |
| Frontend có thêm `/model-test` và `/labeling` | Không nằm trong danh sách 5 trang ban đầu, nhưng đang là chức năng thực tế | Giữ trong kiến trúc vì phục vụ bảo vệ và gán nhãn/fine-tune. |
| Frontend gọi `GET /history` nhưng backend chưa có endpoint tương ứng | `api.js` có `HISTORY`, `App.jsx` có HistoryPage; `backend/main.py` chưa định nghĩa `/history` | Thêm backend history endpoint hoặc bỏ/ẩn chức năng history nếu không dùng. |
| `.env.example` đang là template cũ YouTube/Gemini/Supabase | Không khớp biến môi trường TikUniSent | Viết lại `.env.example` gồm `APIFY_API_TOKEN`, `PHOBERT_MODEL_PATH`, `VNCORENLP_PATH`, `API_PORT`, `CORS_ORIGINS`, `VITE_API_URL`. |
| Preprocessing inference và labeling đang dùng hai module khác nhau | `backend/preprocessing.py` cho labeling; `backend/sentiment.py` thử import `modules.text_preprocessor.preprocess` | Nên gom về một module preprocessing chuẩn để train/inference/labeling cùng logic. |
| VnCoreNLP chưa được dùng trong sentiment code hiện tại | Kiến trúc yêu cầu VnCoreNLP tách từ trước PhoBERT, nhưng `backend/sentiment.py` chưa gọi VnCoreNLP | Tích hợp VnCoreNLP hoặc cập nhật kiến trúc nói rõ hiện tại dùng tokenizer của Hugging Face trực tiếp. |
| CORS đang `allow_origins=['*']` | Yêu cầu có `CORS_ORIGINS`, nhưng code chưa đọc env này | Đọc `CORS_ORIGINS` từ `.env` và cấu hình allowlist. |

### ❌ Sai hoàn toàn

| Item | Lý do | Cách sửa |
|---|---|---|
| Gemini vẫn còn trong runtime health/model init | Yêu cầu mới nói Gemini không còn được dùng nữa; code vẫn import `google.genai`, `_init_gemini()`, `gemini_enabled` | Gỡ import/init Gemini khỏi `backend/sentiment.py`, bỏ `gemini_enabled` khỏi health hoặc đổi thành `deprecated=false`. |
| `backend/requirements.txt` vẫn có `google-genai` | Không còn cần nếu Gemini bị loại khỏi kiến trúc | Xóa `google-genai>=1.0.0` sau khi gỡ code Gemini. |
| `backend/services/gemini_api.py` còn tồn tại | Dễ gây hiểu nhầm Gemini là một service đang dùng | Xóa file hoặc đổi tên sang `deprecated_gemini_api.py` và không import ở runtime. |
| `.env.example` còn `GEMINI_API_KEY`, YouTube, Supabase | Sai domain của TikUniSent hiện tại | Viết lại hoàn toàn `.env.example` theo backend/frontend hiện tại. |

### 🗑️ Cần xóa

| File/Item | Lý do |
|---|---|
| `backend/services/gemini_api.py` | Gemini không còn là thành phần production theo yêu cầu mới. |
| `google-genai` trong `backend/requirements.txt` | Dependency không cần thiết nếu bỏ Gemini. |
| `GEMINI_API_KEY` trong `.env.example` | Không nên hướng dẫn cấu hình dịch vụ đã deprecated. |
| Các biến YouTube/Supabase cũ trong `.env.example` | Không thuộc kiến trúc TikUniSent FastAPI + React + PhoBERT hiện tại. |

