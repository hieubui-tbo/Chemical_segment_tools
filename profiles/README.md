# Thư viện hồ sơ sản phẩm (dùng chung cho cả nhóm)

Mỗi file `.json` trong thư mục này là **một hồ sơ sản phẩm**: bộ phân khúc & từ khóa, danh sách loại trừ,
thiết lập logic (hệ số đơn vị, khoảng giá hợp lý, cách xác định phân khúc, quy tắc ngoại lai…), và có thể
kèm từ điển DN / Industry Master đã nghiên cứu.

Mọi file ở đây tự xuất hiện trong mục **Hồ sơ sản phẩm → Thư viện chung** của công cụ sau mỗi lần deploy.

## Thêm hoặc cập nhật một hồ sơ (không cần biết lập trình)

1. Trong công cụ: chọn/tạo hồ sơ, chỉnh phân khúc ở bước 10 và các thiết lập cần thiết.
2. Mở **Hồ sơ sản phẩm** → **Xuất file hồ sơ** → được file `HoSo_<tên>.json`.
3. Trên GitHub, mở thư mục `profiles/` → **Add file → Upload files** → kéo file vào → **Commit changes**.
   - Cập nhật hồ sơ có sẵn: tải lên file **cùng tên** để ghi đè (hoặc sửa trực tiếp trên GitHub).
4. Vercel tự build lại (khoảng 1 phút). Cả nhóm tải lại trang là thấy hồ sơ mới.

Nếu file hồ sơ bị lỗi, bước build sẽ dừng và **bản đang chạy giữ nguyên** (không ảnh hưởng người dùng);
xem lỗi trong mục Deployments của Vercel, sửa file rồi tải lên lại.

## Lưu ý

- `id` phải khác nhau giữa các hồ sơ (công cụ tự tạo từ tên).
- Hồ sơ trong thư viện là **công khai với những ai mở được công cụ** (và với ai xem được kho GitHub).
  Không đưa dữ liệu nhạy cảm của khách hàng vào đây; nếu có, hãy để kho GitHub ở chế độ **Private**
  và bật bảo vệ truy cập trên Vercel.
- Dữ liệu giao dịch tải vào công cụ **không** được lưu ở đây hay gửi lên máy chủ — chỉ xử lý trong trình duyệt.
