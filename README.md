# ChemSeg Analyst V18.1

Công cụ xử lý dữ liệu xuất nhập khẩu hóa chất & phân bón — The Blue Ocean.

Biến cơ sở dữ liệu giao dịch thô (nhiều năm, nhiều nguồn) thành bộ số liệu sạch, truy vết được:
chuẩn hóa doanh nghiệp, xếp hạng Top 80%, phân loại phân khúc, quy đổi về tấn, lọc giá bất thường,
chỉ số giá theo phân khúc, báo cáo kiểm toán Excel. Dùng cho **mọi sản phẩm** nhờ **Hồ sơ sản phẩm**.

- Dữ liệu chỉ xử lý trong trình duyệt của người dùng — không gửi lên máy chủ.
- Hướng dẫn đầy đủ (Word) tải ngay trong công cụ: thanh bên trái → **Hướng dẫn (Word)**
  (file nguồn: `public/Huong_dan_su_dung_ChemSeg.docx`).

## Hồ sơ sản phẩm

Mỗi sản phẩm một hồ sơ: bộ phân khúc & từ khóa, danh sách loại trừ, hệ số đơn vị, khoảng giá hợp lý,
cách xác định phân khúc, quy tắc ngoại lai, (tùy chọn) từ điển DN & Industry Master.

| Nơi lưu | Ai thấy | Cập nhật |
|---|---|---|
| `profiles/*.json` (thư viện chung) | Cả nhóm | Thêm/ghi đè file trên GitHub → Vercel tự build lại |
| Trình duyệt (“Trên máy này”) | Người dùng đó | Bấm Lưu trong công cụ |
| File `HoSo_<tên>.json` | Người nhận file | Xuất / Nhập file hồ sơ |

Xem `profiles/README.md`. Hồ sơ lỗi ⇒ `npm run build` dừng ⇒ Vercel giữ nguyên bản đang chạy.

## Triển khai (Vercel)

Dự án đã có `vercel.json` (Framework Vite · Build `npm run build` · Output `dist`).

1. vercel.com → **Add New… → Project** → chọn kho GitHub này → **Deploy** (chỉ làm lần đầu).
2. Mỗi lần đẩy thay đổi lên GitHub: nhánh phụ ⇒ bản xem trước (Preview); nhánh `main` ⇒ bản của cả nhóm (Production).
3. Giới hạn người truy cập: Vercel → Settings → **Deployment Protection** → Vercel Authentication (All Deployments).
   Dùng cho công việc của công ty cần gói **Pro** theo điều khoản của Vercel.

## Chạy trên máy (cho người phát triển)

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # 101 kiểm thử tự động
npm run build            # kiểm tra profiles/ rồi đóng gói vào dist/
npm run check-profiles   # chỉ kiểm tra thư viện hồ sơ
npm run pipeline -- <file_du_lieu.xlsx> <file_bo_tu_khoa.xlsx>   # chạy toàn quy trình bằng dòng lệnh
npm run samples          # tạo lại dữ liệu mẫu trong public/mau/
```

## Quy trình 14 bước

| Giai đoạn | Bước |
|---|---|
| A. Chuẩn bị dữ liệu | 1 Hồ sơ & tải dữ liệu · 2 Ánh xạ cột · 3 Kiểm tra chất lượng |
| B. Làm sạch & chuẩn hóa số liệu | 4 Bổ sung số liệu · 5 Đối chiếu giá trị · 6 Quy đổi đơn vị về tấn |
| C. Doanh nghiệp & thị trường | 7 Chuẩn hóa DN · 8 Xếp hạng Top · 9 Gán ngành |
| D. Phân khúc & giá | 10 Bộ từ khóa phân khúc · 11 Phân loại · 12 Lọc ngoại lai IQR · 13 Chỉ số phân khúc |
| E. Xuất báo cáo | 14 Xuất kết quả |

## Kiến trúc

```
profiles/            Thư viện hồ sơ sản phẩm dùng chung (tự nạp khi build)
public/              Hướng dẫn Word + dữ liệu mẫu (tải trực tiếp từ công cụ)
src/engine/          Logic xử lý (JavaScript thuần, không phụ thuộc giao diện)
  engine.js          Điều phối 14 bước, trạng thái, tự làm mới các bước sau khi chạy lại
  profile.js         Kiểm tra / chuẩn hóa hồ sơ  ·  profileApply.js: áp dụng & đóng gói hồ sơ
  steps/             prep · price (đơn vị, IQR, chỉ số) · entity · ranking · industry
                     keywords (bộ phân khúc & so khớp) · classify (phân loại, xem trước độ phủ, gợi ý)
  dict/              Từ điển quốc gia (ISO2/ISO3/EN/VN), đơn vị, hình thức pháp lý & cụm từ tên DN
  io/                Đọc file (tự dò năm, dòng tiêu đề) · xuất Excel & hồ sơ
src/worker/          Web Worker — xử lý ở luồng riêng, giao diện không bị treo
src/ui/, src/steps/  Giao diện React (tiếng Việt) · ProfileManager.jsx: quản lý hồ sơ
tests/               Kiểm thử đơn vị + toàn trình trên bộ dữ liệu có cài bẫy
scripts/             Kiểm tra hồ sơ trước build, chạy dòng lệnh, sinh dữ liệu mẫu
```

## Ghi chú kỹ thuật

- SheetJS `xlsx@0.18.5` (bản cuối trên npm). Bản vá bảo mật 0.20.3 chỉ phát hành qua
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — có thể thay trong `package.json` khi mạng cho phép.
- Phông chữ Be Vietnam Pro & JetBrains Mono đóng gói cục bộ (@fontsource) — chạy được không cần Internet.
