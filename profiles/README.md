# Thư viện hồ sơ sản phẩm dùng chung (tùy chọn — mặc định để trống)

Công cụ không kèm sẵn hồ sơ của dự án nào. Mỗi người tự tạo hồ sơ trong công cụ
(**Hồ sơ sản phẩm → Tạo hồ sơ trống**), lưu trên trình duyệt và **Xuất file hồ sơ** (.json) để giữ lâu dài
hoặc gửi đồng nghiệp (**Nhập file hồ sơ**).

Chỉ khi nhóm muốn một hồ sơ hiện sẵn cho mọi người, người quản trị mã nguồn mới đặt file `.json` vào thư mục này:

1. Trên GitHub, mở thư mục `profiles/` → **Add file → Upload files** → kéo file `HoSo_<tên>.json` vào → **Commit changes**.
2. Vercel tự build lại (~1 phút); hồ sơ hiện ở mục **Thư viện chung** của công cụ.
3. File lỗi ⇒ build dừng, **bản đang chạy giữ nguyên**; xem lỗi trong mục Deployments của Vercel.

Lưu ý: mọi file ở đây hiển thị cho người mở được công cụ (và người xem được kho GitHub). **Không đưa dữ liệu,
tên khách hàng hay bộ từ khóa nhạy cảm của dự án vào đây.**
