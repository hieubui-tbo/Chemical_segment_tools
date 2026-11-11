/* Nội dung hướng dẫn trong công cụ: ngắn gọn ở thẻ, chi tiết trong ngăn "Logic & hướng dẫn". */
const F = ({ children }) => <code className="formula">{children}</code>;

export const GUIDES = {
  upload: {
    tagline: "Chọn hồ sơ sản phẩm, rồi đưa dữ liệu xuất nhập khẩu nhiều năm vào công cụ.",
    purpose: "Nạp cấu hình đúng cho sản phẩm đang nghiên cứu và gom dữ liệu các năm vào một chỗ.",
    todo: "Chọn hồ sơ sản phẩm → kéo thả file dữ liệu → kiểm tra cột Năm của từng sheet → Xác nhận.",
    result: "Danh sách năm và số dòng mỗi năm. Dữ liệu gốc được giữ nguyên, không bị sửa.",
    details: (
      <>
        <h4>Hồ sơ sản phẩm là gì?</h4>
        <p>Mỗi sản phẩm (NH4Cl, Urê, DAP, axit…) có đặc thù riêng: phân khúc theo tiêu chí nào, từ khóa nào, hàng nào lẫn vào cần loại, đơn vị tính lạ, khoảng giá hợp lý, quy tắc lọc ngoại lai. <b>Hồ sơ sản phẩm</b> lưu toàn bộ các lựa chọn đó thành một gói để dùng lại và chia sẻ.</p>
        <ul>
          <li><b>Thư viện chung</b>: hồ sơ của cả nhóm, nằm trong thư mục <code>profiles/</code> của dự án — thêm file lên GitHub là cả nhóm có sau ~1 phút.</li>
          <li><b>Trên máy này</b>: hồ sơ bạn lưu trong trình duyệt. Muốn chia sẻ: <b>Xuất file hồ sơ</b> (.json) → gửi đồng nghiệp hoặc đưa vào thư viện chung.</li>
          <li>Sản phẩm mới: <b>Nhân bản</b> hồ sơ “Mẫu khởi đầu” (hoặc Tạo hồ sơ trống) → soạn phân khúc ở bước 10 → Lưu.</li>
          <li>Công cụ tự mở lại hồ sơ bạn dùng lần trước.</li>
        </ul>
        <h4>Quy tắc nhận diện năm</h4>
        <ul>
          <li>Ưu tiên năm trong <b>tên sheet</b>: "2023", "2023_Data", "Data2023", "Sheet 2023" đều nhận được.</li>
          <li>Nếu không sheet nào mang năm, lấy năm trong <b>tên file</b> (vd: <code>Urea_2024.xlsx</code>) cho sheet có nhiều dòng nhất.</li>
          <li>Nhiều nguồn cùng một năm (vd: file Q1, Q2) sẽ được <b>gộp</b> thành một năm.</li>
          <li>Có thể sửa năm, bật/tắt từng sheet trước khi xác nhận.</li>
        </ul>
        <h4>Dòng tiêu đề</h4>
        <p>Công cụ dò trong 30 dòng đầu, chọn dòng có nhiều ô chữ và khớp tên cột quen thuộc nhất — file có dòng tiêu đề báo cáo phía trên vẫn đọc đúng.</p>
        <h4>Bảo mật & dung lượng</h4>
        <ul>
          <li>Dữ liệu được xử lý <b>ngay trong trình duyệt</b>, không gửi lên máy chủ.</li>
          <li>Đã thử với ~71.000 dòng × 6 năm: đọc ~4 giây, xử lý toàn bộ ~10 giây. Với dữ liệu &gt; 500.000 dòng nên dùng Chrome/Edge 64-bit và đóng bớt tab.</li>
        </ul>
      </>
    ),
  },
  schema: {
    tagline: "Cho công cụ biết cột nào là Mô tả, Người mua, Trị giá, Đơn vị…",
    purpose: "Thống nhất tên trường giữa các năm (mỗi năm có thể đặt tên cột khác nhau).",
    todo: "Kiểm tra gợi ý tự động. Ô viền đỏ = chưa có cột. Năm nào dùng tên cột khác thì chỉnh riêng ở bảng theo năm.",
    result: "Ánh xạ cột của từng năm được khóa lại để mọi bước sau dùng chung.",
    details: (
      <>
        <h4>Trường bắt buộc</h4>
        <p>Mô tả hàng hóa · Nhà cung cấp · Người mua · Nước xuất xứ · Nước nhập khẩu · Đơn giá · Trị giá · Khối lượng/Số lượng · Đơn vị tính.</p>
        <h4>Trường tùy chọn (nên có)</h4>
        <ul>
          <li><b>Nguồn dữ liệu</b> — bật tính năng phát hiện giao dịch trùng giữa các nguồn (vd: "Vietnam" và "VietChina" cùng ghi một lô hàng).</li>
          <li><b>Ngày</b> — dùng để so khớp trùng nguồn (lệch ≤ 10 ngày) và kiểm tra ngày khác năm của sheet.</li>
          <li><b>Mã HS</b> — giữ lại trong file xuất để lọc.</li>
        </ul>
        <h4>Gợi ý tự động hoạt động thế nào</h4>
        <p>Chấm điểm từng cặp (trường, cột): trùng tên hoàn toàn &gt; bắt đầu/kết thúc bằng tên quen thuộc &gt; chứa tên quen thuộc. Cột điểm cao được gán trước, mỗi cột chỉ dùng cho một trường ⇒ "Unit Price" không bị nhận nhầm là "Unit".</p>
      </>
    ),
  },
  quality: {
    tagline: "Chụp X-quang dữ liệu trước khi xử lý.",
    purpose: "Phát hiện sớm ô trống, số lưu dạng chữ, placeholder, đơn vị lạ, quốc gia không nhận diện, dòng trùng.",
    todo: "Bấm Chạy, đọc các cảnh báo. Không cần sửa file gốc — các bước sau tự xử lý những lỗi này.",
    result: "Bảng chất lượng từng năm; danh sách đơn vị & quốc gia cần chú ý; cột Dòng trùng lặp.",
    details: (
      <>
        <h4>Đọc số "chịu lỗi"</h4>
        <p>Công cụ đọc được: <code>1,234.56</code> · <code>1.234,56</code> · <code>12 500</code> · <code>$1,200</code> · <code>1200 USD</code> · <code>(123)</code> = −123. Ô chữ như "N/A" được đếm là <b>Chữ</b>.</p>
        <h4>Dòng đủ dữ liệu cốt lõi</h4>
        <p>Có người mua + mô tả + giá trị tính được (Trị giá, hoặc Đơn giá × Lượng) + lượng &gt; 0 + đơn vị.</p>
        <h4>Dòng trùng lặp</h4>
        <p>Giống hệt một dòng trước đó (cùng năm) trên <b>mọi trường đã ánh xạ</b>. Chỉ đánh dấu — có loại hay không do bạn chọn ở bước 13 (mặc định giữ, vì nhiều lô hàng giống nhau trong cùng tháng là bình thường).</p>
      </>
    ),
  },
  backfill: {
    tagline: "Tự tính lại trường số bị thiếu từ hai trường còn lại.",
    purpose: "Tận dụng tối đa dòng dữ liệu: thiếu một trong ba trường Đơn giá / Trị giá / Lượng vẫn dùng được.",
    todo: "Bấm Chạy. Không cần thiết lập.",
    result: "Ba cột sạch: Đơn giá (sạch), Trị giá (sạch), Lượng (sạch) + cột ghi rõ trường nào được bổ sung.",
    details: (
      <>
        <h4>Công thức</h4>
        <F>{"Thiếu Đơn giá  →  Đơn giá = Trị giá / Lượng\nThiếu Trị giá  →  Trị giá = Đơn giá × Lượng\nThiếu Lượng    →  Lượng   = Trị giá / Đơn giá"}</F>
        <ul>
          <li>Chỉ bổ sung khi thiếu <b>đúng một</b> trường và hai trường kia &gt; 0.</li>
          <li>Ô trống, bằng 0, số âm, chữ đều coi là "thiếu".</li>
          <li><b>Dữ liệu gốc giữ nguyên</b> (V17 ghi đè lên cột gốc — đã sửa).</li>
        </ul>
      </>
    ),
  },
  validate: {
    tagline: "Kiểm tra Đơn giá × Lượng có khớp Trị giá không.",
    purpose: "Đánh dấu dòng có số liệu tự mâu thuẫn — thường do nhập sai đơn vị hoặc sai cột.",
    todo: "Chọn ngưỡng lệch (mặc định 30%) rồi bấm Chạy.",
    result: "Cột Đối chiếu giá trị (Hợp lệ / Lệch vượt ngưỡng / Thiếu dữ liệu / Đã bổ sung) và tỷ lệ lệch.",
    details: (
      <>
        <h4>Công thức</h4>
        <F>{"Tỷ lệ lệch = |Đơn giá × Lượng − Trị giá| / Trị giá\nLệch > ngưỡng  ⇒  \"Lệch vượt ngưỡng\""}</F>
        <ul>
          <li>Dòng vừa được bổ sung ở bước 4 luôn khớp theo cấu trúc ⇒ ghi "Đã bổ sung (không kiểm được)" thay vì "Hợp lệ" để không tô đẹp số liệu.</li>
          <li>Kết quả dùng ở bước 13: quy tắc mặc định chỉ loại dòng VỪA lệch giá trị VỪA ngoại lai IQR.</li>
        </ul>
      </>
    ),
  },
  units: {
    tagline: "Đưa mọi lượng về tấn (MT) và tính đơn giá USD/tấn.",
    purpose: "Có thước đo chung để so sánh giá giữa các nguồn dùng KGM, TNE, LBS, bao, chai…",
    todo: "Bấm Chạy một lần → xem bảng đơn vị → nhập hệ số cho đơn vị chưa có (vd TND = 1) → Chạy lại.",
    result: "Cột Lượng (tấn), Đơn giá (USD/tấn), Hệ số quy đổi và Trạng thái quy đổi cho từng dòng.",
    details: (
      <>
        <h4>Từ điển đơn vị có sẵn</h4>
        <ul>
          <li>Tấn: TNE, MT, MTS, TONNE, METRIC TON(S), TONELADA METRICA, TẤN… (hệ số 1)</li>
          <li>Kilogram: KGM, KG, KGS, KGL, KILOGRAMO… (0,001) · Gram: GRM, G, GR (0,000001) · Pound: LBS, LBR (0,000453…)</li>
          <li>Short ton (0,907) · Long ton (1,016) · Tạ/Decitonne DTN (0,1)</li>
          <li><b>TON / TONS / T</b> là <b>mơ hồ</b> (metric? short? long?) ⇒ mặc định không quy đổi; bạn tự quyết định hệ số.</li>
        </ul>
        <h4>Gợi ý hệ số theo giá</h4>
        <p>Với đơn vị chưa có trong từ điển, công cụ thử các hệ số chuẩn và chọn hệ số cho giá ngụ ý gần nhất với giá tham chiếu (trung vị có trọng số trị giá của các dòng đơn vị chuẩn), chỉ khi lệch &lt; 4 lần (chỉ áp dụng cho đơn vị mơ hồ/chưa có trong từ điển; bao/chai/kiện dùng suy luận theo mô tả). Đây là <b>gợi ý</b> — bạn quyết định áp dụng.</p>
        <h4>Suy luận khối lượng bao bì từ mô tả</h4>
        <p>Khi đơn vị là bao/chai/kiện (BAG, BTL, PCS, UNT…) và mô tả ghi rõ "25 KG BAG", "BOLSAS DE 25 KG", "500G/BOTTLE", "X 1 KG"… công cụ dùng khối lượng đó làm hệ số. Chỉ áp dụng cho dòng có trị giá, và chỉ nhận khi giá ngụ ý nằm trong khoảng hợp lý (1/20 – 500 lần giá tham chiếu). Có thể tắt.</p>
        <F>{"Lượng (tấn) = Lượng (sạch) × Hệ số\nĐơn giá (USD/tấn) = Trị giá (sạch) / Lượng (tấn)"}</F>
        <p>Sản phẩm lỏng tính theo lít/m³: chọn <b>Tùy chỉnh…</b> và nhập hệ số = khối lượng riêng (tấn/m³) ÷ 1.000 cho lít (vd: dung dịch 1,2 t/m³ ⇒ LTR = 0,0012). Hệ số được lưu trong hồ sơ sản phẩm.</p>
        <h4>Kiểm tra giá/tấn phi lý (nghi sai đơn vị)</h4>
        <p><b>Khoảng giá hợp lý</b> có thể đặt theo đặc thù sản phẩm (vd: phân bón 80–2.000 USD/t; hóa chất tinh khiết cao hơn nhiều) — giá trị này lưu trong hồ sơ sản phẩm. Để trống thì công cụ tự tính như sau:</p>
        <p>Giá/tấn thấp hơn 1/50 hoặc cao hơn 2.000 lần giá tham chiếu ⇒ đánh dấu "Thấp/Cao phi lý – nghi sai đơn vị", loại khỏi mẫu IQR và khỏi chỉ số (bất kể quy tắc ngoại lai). Ví dụ thật trong dữ liệu NH4Cl 2023: 4 dòng Indonesia ghi lượng 506.000 "TNE" (thực chất là kg) ⇒ giá 0,11 USD/tấn và làm phình lượng thêm gần 2 triệu tấn. Các dòng này "khớp" Đơn giá × Lượng nên quy tắc AND không bao giờ loại được, và IQR tuyến tính cũng bỏ sót vì ngưỡng dưới âm.</p>
      </>
    ),
  },
  entity: {
    tagline: "Gộp các cách viết khác nhau của cùng một doanh nghiệp — thống nhất cho mọi năm.",
    purpose: "Một DN có thể xuất hiện dưới nhiều tên (Việt/Anh, viết tắt, lỗi chính tả). Gộp đúng thì xếp hạng mới đúng.",
    todo: "Giữ thiết lập mặc định, bấm Chạy. Lọc 'Cần rà soát' để kiểm tra; sửa bằng file từ điển nếu cần.",
    result: "Từ điển DN mua/DN bán với mã nhóm, tên chuẩn hóa, độ tin cậy, cờ rủi ro; cờ trùng giữa các nguồn.",
    details: (
      <>
        <h4>Các tầng so khớp</h4>
        <ol>
          <li><b>Placeholder</b>: TO ORDER, NONE, N/A, ô trống, "THEO LỆNH"… ⇒ [Không xác định], không tạo DN.</li>
          <li><b>Từ điển người dùng</b> (nếu tải lên) — ưu tiên tuyệt đối.</li>
          <li><b>Khóa lõi</b>: bỏ dấu, chuyển chữ Kirin sang Latin, bỏ hình thức pháp lý (CO LTD, JSC, TNHH, CTCP, MTV, PT, SDN BHD, OOO…), dịch cụm tiếng Việt sang tiếng Anh (THƯƠNG MẠI→TRADING, PHÂN BÓN→FERTILIZER…), chuẩn đồng nghĩa (CHEMICALS→CHEMICAL…). Từ chung được sắp xếp, <b>phần tên riêng giữ nguyên thứ tự</b> ⇒ "Phân bón Phú Bình" ≡ "Phu Binh Fertilizer" nhưng "Phú Hưng" ≠ "Hưng Phú". Độ tin cậy: <b>Chính xác / Cao</b>.</li>
          <li><b>Trùng phần tên riêng</b> (bỏ từ chung): "Thuy Ngan Co., Ltd." ≡ "Thuy Ngan Trading Company". Chặn tên riêng quá phổ biến (&gt; 6 biến thể). Độ tin cậy <b>Trung bình</b> ⇒ Cần rà soát.</li>
          <li><b>Lỗi chính tả</b>: khoảng cách Levenshtein trên phần tên riêng ≥ 10 ký tự, tối đa 1 lỗi (10–19 ký tự) hoặc 2 lỗi (≥ 20 ký tự). Độ tin cậy <b>Thấp/Trung bình</b> ⇒ Cần rà soát.</li>
        </ol>
        <h4>Quy tắc nhóm theo quốc gia</h4>
        <ul>
          <li>DN mua: luôn nhóm theo tên + nước nhập khẩu.</li>
          <li>DN bán: mặc định nhóm <b>chỉ theo tên</b> vì "Nước xuất xứ" là xuất xứ HÀNG HÓA, không phải trụ sở người bán (một trader Singapore bán hàng xuất xứ Trung Quốc và Nga). Có thể bật lại kiểu V17.</li>
        </ul>
        <h4>Tên hiển thị</h4>
        <p>Chọn từ một biến thể <b>có thật</b> trong dữ liệu (ưu tiên tên tiếng Anh, giá trị lớn, không bị cắt cụt), chỉ làm sạch hậu tố pháp lý và kiểu chữ — không ghép/dịch ra tên không tồn tại.</p>
        <h4>Trùng giữa các nguồn</h4>
        <p>Cùng năm · cùng lượng · cùng trị giá (±1 USD) · cùng DN mua hoặc DN bán · ngày lệch ≤ 10 ngày · nhưng khác "Nguồn dữ liệu" ⇒ đánh dấu bản ghi ưu tiên thấp hơn (giữ bản ghi nhập khẩu của chính nước mua). Với dữ liệu NH4Cl thử nghiệm: phát hiện ~1.650 dòng, ~17,5 triệu USD trùng (chủ yếu VietChina ↔ Vietnam năm 2020).</p>
        <h4>Sửa kết quả gộp</h4>
        <p>Xuất "File rà soát tên DN" → điền cột <b>Tên chuẩn hóa (sửa)</b> (cùng tên ⇒ gộp; tên khác ⇒ tách; <code>#LOAI</code> ⇒ coi là không xác định) → tải lại → Chạy lại. File này dùng lại được cho các lần cập nhật dữ liệu sau.</p>
      </>
    ),
  },
  ranking: {
    tagline: "Tìm nhóm doanh nghiệp chiếm phần lớn giá trị — danh sách ưu tiên nghiên cứu.",
    purpose: "Khoanh vùng DN quan trọng nhất từng năm theo nhiều phạm vi: toàn cầu, Việt Nam, từng châu lục.",
    todo: "Chọn ngưỡng (mặc định 80%) và tiêu chí (trị giá hoặc khối lượng) → Chạy → tải file nghiên cứu.",
    result: "Bảng xếp hạng + biểu đồ Pareto; file Top DN theo phạm vi; danh sách DN cần nghiên cứu ngành.",
    details: (
      <>
        <h4>Cách tính</h4>
        <F>{"Giá trị DN (năm, phạm vi) = Σ Trị giá (sạch) các dòng của DN\nTỷ trọng = Giá trị DN / Tổng giá trị DN xác định được trong phạm vi\nThuộc Top ⇔ lũy kế TRƯỚC DN đó < ngưỡng"}</F>
        <ul>
          <li>Gộp theo <b>mã nhóm DN</b> từ bước 7 (V17 gộp theo chuỗi tên + chuỗi quốc gia ⇒ "Viet Nam" và "VIETNAM" bị tách).</li>
          <li>Placeholder bị loại khỏi mẫu số; tỷ trọng giá trị "không xác định" được báo riêng để bạn biết độ phủ.</li>
          <li>Dòng nghi trùng nguồn khác không được cộng (nếu bật).</li>
          <li>Phạm vi: Nhập khẩu (toàn cầu, Việt Nam, từng châu lục) · Xuất khẩu (toàn cầu, bán vào Việt Nam, từng châu lục xuất xứ).</li>
          <li>Xếp hạng theo <b>khối lượng</b> hữu ích khi nhiều nguồn vận đơn (BL) không có trị giá, nhưng lưu ý dữ liệu BL có thể trùng với hải quan.</li>
        </ul>
      </>
    ),
  },
  industry: {
    tagline: "Gắn ngành / phân khúc ngành cho doanh nghiệp mua từ kết quả nghiên cứu.",
    purpose: "Khi mô tả hàng hóa không đủ để phân loại, ngành của người mua là phương án dự phòng.",
    todo: "Tải danh sách DN cần nghiên cứu (bước 8), điền Ngành & Phân khúc ngành, tải lên đây → Áp dụng. Không có thì Bỏ qua.",
    result: "Cột Ngành, Phân khúc ngành, Cách khớp cho mọi dòng; danh sách DN thuộc Top còn thiếu ngành.",
    details: (
      <>
        <ul>
          <li>Đọc <b>mọi sheet</b> của <b>mọi file</b> (V17 chỉ đọc sheet đầu ⇒ mất dữ liệu các năm sau).</li>
          <li>Nhận cả tiêu đề tiếng Anh của V17 (<code>Purchaser_Standardize | Purchasing Country | Industry | Industry Segment</code>) lẫn tiếng Việt.</li>
          <li>So khớp theo <b>khóa lõi</b> của tên + quốc gia ⇒ file nghiên cứu cũ của V17 vẫn dùng được dù tên hiển thị đã thay đổi.</li>
          <li>Ngành là thuộc tính của DN ⇒ mặc định gán cho mọi dòng của DN (V17 chỉ gán cho dòng thuộc Top năm đó). Có tùy chọn quay về kiểu cũ.</li>
          <li>Cùng DN có nhiều ngành khác nhau giữa các file ⇒ dùng dòng tải sau, ghi vào danh sách xung đột.</li>
        </ul>
      </>
    ),
  },
  keywords: {
    tagline: "Soạn bộ phân khúc & từ khóa ngay trong công cụ — xem trước độ phủ trước khi chạy.",
    purpose: "Định nghĩa phân khúc theo ý đồ nghiên cứu (mục đích sử dụng, cấp chất lượng, mã HS…) — bạn toàn quyền kiểm soát.",
    todo: "Sửa phân khúc/từ khóa ở thẻ Soạn → Xem trước độ phủ & gợi ý → thêm từ khóa gợi ý → Áp dụng → Lưu vào hồ sơ.",
    result: "Bộ phân khúc dùng cho bước Phân loại; tỷ lệ trị giá được phân loại; danh sách từ khóa không khớp dòng nào.",
    details: (
      <>
        <h4>Cách soạn</h4>
        <ul>
          <li>Mỗi thẻ là một phân khúc: tên + danh sách từ khóa (mỗi dòng một từ/cụm từ) + từ khóa loại trừ riêng.</li>
          <li><code>GALVANIZ*</code> — khớp mọi từ bắt đầu bằng GALVANIZ (GALVANIZING, GALVANIZED…).</li>
          <li>Loại trừ riêng: mô tả có “FEED GRADE” thì không xếp vào phân khúc Phân bón dù có chữ FERTILIZER.</li>
          <li>Thẻ đỏ <b>LOẠI TRỪ</b>: dòng khớp là “Ngoài phạm vi sản phẩm” và bị loại khỏi chỉ số giá — rất cần cho dữ liệu vận đơn (vd: hợp chất amoni bậc bốn, kẽm clorua lẫn trong dữ liệu NH4Cl).</li>
          <li>Thứ tự thẻ dùng để phân xử khi hai phân khúc hòa — dùng mũi tên để sắp xếp.</li>
        </ul>
        <h4>Xem trước độ phủ & gợi ý từ khóa</h4>
        <p>Chạy bộ phân khúc đang soạn trên toàn bộ dữ liệu (không đổi kết quả hiện có): tỷ lệ trị giá được phân loại, từng phân khúc chiếm bao nhiêu, mô tả chưa phân loại lớn nhất. <b>Gợi ý</b> là các từ/cụm 2 từ xuất hiện nhiều (theo trị giá) trong mô tả chưa phân loại, đã bỏ từ chung chung (bao bì, đơn vị, số…) và từ có ở hơn một nửa số mô tả (thường là tên sản phẩm). Chọn phân khúc ở cột “Thêm vào” để thêm ngay.</p>
        <h4>Nhập / xuất Excel</h4>
        <p>Vẫn dùng được file kiểu V17: <b>STT | Phân khúc 1 | Phân khúc 2 | … | LOẠI TRỪ</b>, từ khóa liệt kê dưới mỗi cột, <code>-</code> ở đầu là loại trừ riêng. Bộ đang soạn cũng xuất được ra Excel theo đúng định dạng này.</p>
      </>
    ),
  },
  classify: {
    tagline: "Xếp từng giao dịch vào một phân khúc.",
    purpose: "Tạo cột Phân khúc cuối cùng làm nền cho phân tích giá và thị phần.",
    todo: "Chọn cách xác định phân khúc theo ý đồ nghiên cứu → Chạy → xem 'Mô tả chưa phân loại' để bổ sung từ khóa ở bước 10.",
    result: "Cột Phân khúc cuối cùng, Cách phân loại, Chi tiết từ khóa khớp; thống kê từng từ khóa.",
    details: (
      <>
        <h4>Cách xác định phân khúc (theo ý đồ nghiên cứu)</h4>
        <ul>
          <li><b>Từ khóa trước, ngành DN dự phòng</b> (mặc định): phân khúc theo mô tả hàng hóa; dòng không khớp thì lấy ngành của DN mua.</li>
          <li><b>Ngành DN trước, từ khóa dự phòng</b>: khi câu hỏi là “ai mua, dùng vào ngành nào” và đã có Industry Master.</li>
          <li><b>Chỉ theo từ khóa</b> hoặc <b>Chỉ theo ngành của DN mua</b>: tách bạch hoàn toàn hai cách tiếp cận.</li>
          <li>Ở mọi cách, cột <b>LOẠI TRỪ</b> luôn có hiệu lực trước (hàng ngoài phạm vi không bao giờ vào chỉ số).</li>
        </ul>
        <F>{"Mặc định:\n1. Khớp cột LOẠI TRỪ           → Ngoài phạm vi sản phẩm\n2. Khớp từ khóa phân khúc       → Phân khúc theo từ khóa\n3. Không khớp, DN có ngành     → Phân khúc ngành (dự phòng)\n4. Còn lại                      → Chưa phân loại"}</F>
        <h4>Khớp theo mã HS</h4>
        <p>Chọn “Mô tả + mã HS” để nối mã HS (chỉ phần chữ số) vào mô tả khi so khớp ⇒ dùng được từ khóa như <code>310230*</code> để tách phân khúc theo mã HS chi tiết.</p>
        <h4>Khi mô tả khớp nhiều phân khúc</h4>
        <p>Chọn phân khúc có <b>nhiều từ khóa khớp nhất</b>; hòa ⇒ phân khúc có từ khóa <b>dài/cụ thể hơn</b>; hòa nữa ⇒ theo thứ tự cột. Hai trường hợp hòa được đánh dấu "nên rà soát".</p>
        <h4>Khớp theo từ nguyên vẹn (mặc định)</h4>
        <p>"UREA" không khớp "THIOUREA", "SA" không khớp "SALT". Không phân biệt hoa/thường, có dấu/không dấu. Chế độ "chứa chuỗi" giữ hành vi V17.</p>
        <h4>Đối chiếu từ khóa – ngành</h4>
        <p>Khi dòng có cả phân khúc từ khóa và phân khúc ngành mà hai giá trị khác nhau ⇒ cột "Đối chiếu từ khóa – ngành" = Khác nhau (nên rà soát).</p>
      </>
    ),
  },
  iqr: {
    tagline: "Phát hiện giá bất thường trong từng phân khúc mỗi năm.",
    purpose: "Tách các mức giá do sai đơn vị/nhập liệu khỏi giá thị trường thực.",
    todo: "Giữ mặc định (k = 1,5) hoặc bật tính trên log(giá) nếu phân khúc có biên độ giá rất rộng → Chạy.",
    result: "Cột Kiểm tra IQR, ngưỡng dưới/trên; bảng thống kê và biểu đồ hộp theo phân khúc.",
    details: (
      <>
        <F>{"Nhóm = Năm × Phân khúc cuối cùng; giá = Đơn giá (USD/tấn) > 0\nQ1, Q3 tính như Excel QUARTILE.INC (nội suy tuyến tính)\nNgưỡng dưới = Q1 − k × IQR ; Ngưỡng trên = Q3 + k × IQR"}</F>
        <ul>
          <li>V17 lấy tứ phân vị bằng <code>sorted[floor(n × 0,25)]</code> — với n nhỏ Q3 có thể bằng giá trị lớn nhất ⇒ không bao giờ phát hiện được ngoại lai phía trên. Đã thay bằng chuẩn Excel để kết quả kiểm tra lại được trên Excel.</li>
          <li>Nhóm có ít hơn số giá tối thiểu ⇒ "Không đủ dữ liệu" (không kết luận).</li>
          <li>Phân phối giá lệch phải (giá thuốc thử gấp 100 lần giá phân bón) ⇒ ngưỡng dưới âm, chỉ lọc được phía trên. Tùy chọn <b>log(giá)</b> xử lý tốt hơn.</li>
        </ul>
      </>
    ),
  },
  metrics: {
    tagline: "Lượng, trị giá, giá bình quân từng phân khúc — trước và sau lọc ngoại lai.",
    purpose: "Ra con số cuối cùng cho báo cáo: quy mô và mặt bằng giá của từng phân khúc qua các năm.",
    todo: "Chọn quy tắc loại ngoại lai (xem bảng độ nhạy để quyết định) → Chạy.",
    result: "Bảng chỉ số trước/sau lọc, biểu đồ so sánh, bảng tổng hợp nhiều năm; cột Giữ lại sau lọc + Lý do loại.",
    details: (
      <>
        <F>{"Giá bình quân = Σ Trị giá (sạch) / Σ Lượng (tấn)   (bình quân gia quyền theo lượng)\nChỉ tính dòng có Trị giá > 0 và Lượng (tấn) > 0"}</F>
        <h4>Quy tắc loại ngoại lai</h4>
        <ul>
          <li><b>AND (mặc định, như V17)</b>: chỉ loại khi VỪA lệch giá trị VỪA ngoại lai IQR. Rất thận trọng — với dữ liệu NH4Cl 2024 chỉ loại 6 dòng.</li>
          <li><b>IQR</b>: loại mọi ngoại lai IQR — bắt được lỗi sai đơn vị (dòng sai đơn vị thường vẫn "khớp" Đơn giá × Lượng nên AND bỏ sót).</li>
          <li><b>OR</b>: loại khi một trong hai — chặt nhất.</li>
        </ul>
        <p>Luôn loại: dòng Ngoài phạm vi sản phẩm; dòng nghi trùng nguồn khác (nếu bật); dòng trùng lặp hoàn toàn (nếu bật).</p>
      </>
    ),
  },
  export: {
    tagline: "Xuất báo cáo kiểm toán và dữ liệu chi tiết ra Excel.",
    purpose: "Bàn giao kết quả có thể truy vết: mỗi con số đều giải thích được bằng cột và nhật ký đi kèm.",
    todo: "Chọn ngôn ngữ tiêu đề cột → tải Báo cáo kiểm toán → tải dữ liệu chi tiết từng năm.",
    result: "File báo cáo 19 sheet (có từ điển cột & cấu hình) + mỗi năm một file chi tiết.",
    details: (
      <>
        <ul>
          <li><b>Báo cáo kiểm toán</b>: tổng quan, chất lượng, bổ sung/đối chiếu, đơn vị, từ điển DN, biến thể tên để sửa, placeholder, trùng nguồn, Top DN, ngành, từ khóa, phân loại, IQR, chỉ số, tổng hợp nhiều năm, từ điển cột, cấu hình.</li>
          <li><b>Dữ liệu chi tiết</b>: mọi cột gốc + toàn bộ cột tính toán (V17 bỏ mất Lượng (tấn), Đơn giá USD/tấn, Cách phân loại…). Sheet "Sau lọc" chỉ gồm dòng Giữ lại = Có.</li>
          <li>Mỗi dòng có Nguồn – file / sheet / dòng Excel gốc để truy vết.</li>
          <li>Tiêu đề tiếng Anh dùng khi cần tương thích công thức/pivot cũ của V17.</li>
        </ul>
      </>
    ),
  },
};
