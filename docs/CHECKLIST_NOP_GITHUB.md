# Checklist nộp GitHub đồ án tốt nghiệp

Tên repository đề xuất:

```text
tn-da22tta-110122086-letuankha-khaunisent
```

Nếu mã lớp chính thức không phải `da22tta`, đổi đúng mã lớp trước khi tạo repository.

## Đã chuẩn bị trong repo

- [x] `README.md` giới thiệu đề tài, kiến trúc, yêu cầu cài đặt và cách chạy.
- [x] `docs/Bao_cao_do_an_tot_nghiep_Le_Tuan_Kha.docx`.
- [x] `docs/Bao_cao_do_an_tot_nghiep_Le_Tuan_Kha.pdf`.
- [x] `docs/Slide_bao_ve_do_an_Le_Tuan_Kha.pptx`.
- [x] `docs/Poster_KhaUniSent_A1.pdf`.
- [x] `docs/HUONG_DAN_SU_DUNG_DEMO.md`.
- [x] `docs/architecture.md`.
- [x] `docs/figures/performance/` chứa biểu đồ hiệu năng.
- [x] `docs/figures/model/` chứa confusion matrix và training history.
- [x] `src/backend/` mã nguồn backend.
- [x] `src/frontend/` mã nguồn frontend.
- [x] `src/scripts/` script train, benchmark, so sánh Gemini.
- [x] `src/data/` dataset final và tập evaluation.
- [x] `src/notebooks/phobert_finetune_final.ipynb`.
- [x] `src/models/README.md` hướng dẫn đặt model.

## Cần bạn kiểm tra trước khi nộp

- [ ] Thay slide trong `docs/Slide_bao_ve_do_an_Le_Tuan_Kha.pptx` nếu đã có bản slide bảo vệ final hơn.
- [ ] Thêm video demo `.mp4` vào `src/demo/`.
- [ ] Kiểm tra trong file báo cáo `.docx/.pdf` tên hệ thống đã thống nhất là `KhaUniSent`.
- [ ] Không commit `.env`, `.venv`, `node_modules`, file model weight lớn.
- [ ] Nếu cần nộp model, upload model lên Google Drive/Hugging Face/GitHub Release và ghi link trong README.
