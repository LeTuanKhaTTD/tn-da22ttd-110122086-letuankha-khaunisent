# Đánh giá thời gian xử lý hệ thống KhaUniSent

Thời gian được đo trên hệ thống hiện tại với mô hình PhoBERT fine-tuned. Các kịch bản video và kênh sử dụng Apify API thật; số bình luận trong bảng là số bình luận thực tế Apify trả về tại thời điểm đo.

## Bảng kết quả

| Mã test | Kịch bản kiểm thử | Số video | Số bình luận | Thu thập dữ liệu (s) | Tiền xử lý (s) | Suy luận PhoBERT (s) | Tổng hợp (s) | Tổng thời gian (s) | Tốc độ (bình luận/giây) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| TC01 | Phân tích 1 bình luận đơn lẻ | 0 | 1 | 0.0000 | 0.0000 | 0.5459 | 0.0000 | 0.5460 | 1.8314 |
| TC02 | Phân tích 1 video nhỏ | 1 | 100 | 15.1941 | 0.0000 | 0.5316 | 0.0001 | 15.7274 | 6.3583 |
| TC03 | Phân tích 1 video trung bình | 1 | 100 | 14.9575 | 0.0000 | 0.3262 | 0.0001 | 15.2844 | 6.5426 |
| TC04 | Phân tích kênh nhiều video | 10 | 369 | 252.9659 | 0.0002 | 3.5949 | 0.0003 | 256.5637 | 1.4382 |

Ghi chú: ở kịch bản TC03, hệ thống yêu cầu phân tích tối đa 300 bình luận, tuy nhiên Apify chỉ trả về 100 bình luận cho video được kiểm thử. Vì vậy bảng giữ nguyên số liệu thực tế là 100 bình luận để đảm bảo tính trung thực của đánh giá.

## Biểu đồ đã xuất

- `D:\Do_an_tot_nghiep\TikUniSent\reports\performance\chart_total_time.png`
- `D:\Do_an_tot_nghiep\TikUniSent\reports\performance\chart_stage_stacked.png`
- `D:\Do_an_tot_nghiep\TikUniSent\reports\performance\chart_comments_vs_time.png`

## Nhận xét

Kịch bản xử lý nhanh nhất là TC01, phân tích một bình luận đơn lẻ, với tổng thời gian khoảng 0,546 giây. Do không cần gọi Apify API, thời gian xử lý chủ yếu nằm ở bước suy luận PhoBERT. Điều này cho thấy khi dữ liệu đầu vào đã có sẵn, mô hình có khả năng phản hồi nhanh đối với tác vụ kiểm thử trực tiếp một bình luận.

Đối với kịch bản phân tích video, tổng thời gian xử lý của TC02 và TC03 lần lượt là 15,7274 giây và 15,2844 giây. Trong cả hai trường hợp, thời gian thu thập dữ liệu qua Apify chiếm phần lớn tổng thời gian, khoảng 15 giây, trong khi thời gian suy luận PhoBERT chỉ dao động từ 0,3262 đến 0,5316 giây. Điều này cho thấy độ trễ của luồng phân tích video phụ thuộc chủ yếu vào tốc độ crawl dữ liệu từ TikTok thông qua Apify.

Kịch bản chậm nhất là TC04, phân tích kênh gồm 10 video và 369 bình luận, với tổng thời gian 256,5637 giây. Giai đoạn thu thập dữ liệu chiếm 252,9659 giây, lớn hơn rất nhiều so với thời gian suy luận PhoBERT là 3,5949 giây. Nguyên nhân là phân tích kênh cần lấy danh sách video, metadata và bình luận từ nhiều video, trong khi TikTok có cơ chế giới hạn và Apify actor cần thời gian chờ run hoàn tất.

Khi số lượng bình luận tăng, thời gian suy luận PhoBERT tăng tương đối ổn định và vẫn thấp hơn nhiều so với thời gian thu thập dữ liệu. Với 369 bình luận ở TC04, PhoBERT xử lý trong khoảng 3,5949 giây, tương đương phần suy luận khoảng 102,65 bình luận/giây. Trong khi đó, tốc độ xử lý toàn pipeline chỉ đạt 1,4382 bình luận/giây do bị chi phối bởi thời gian crawl.

Nhìn chung, hiệu năng của mô hình PhoBERT fine-tuned là ổn định và phù hợp cho hệ thống phân tích cảm xúc bình luận TikTok tiếng Việt. Điểm nghẽn chính của hệ thống không nằm ở mô hình NLP mà nằm ở bước thu thập dữ liệu qua Apify API. Vì vậy, khi triển khai thực tế, thời gian phản hồi của chức năng phân tích video và phân tích kênh sẽ phụ thuộc đáng kể vào quota, tốc độ actor, số lượng video, số lượng bình luận và mức độ chặn dữ liệu từ TikTok.
