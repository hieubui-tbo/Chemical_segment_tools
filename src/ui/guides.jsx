/* Nội dung hướng dẫn trong công cụ: ngắn gọn ở thẻ, chi tiết trong ngăn "Logic & hướng dẫn". */
const F = ({ children }) => <code className="formula">{children}</code>;

export const GUIDES = {
  upload: {
    tagline: "Chọn hồ sơ sản phẩm, sau đó tải lên dữ liệu xuất nhập khẩu của các năm cần phân tích.",
    purpose: "Chọn đúng hồ sơ sản phẩm để áp dụng cấu hình phù hợp, rồi tập hợp dữ liệu của các năm vào cùng một quy trình xử lý.",
    todo: "Chọn hồ sơ sản phẩm → kéo thả file dữ liệu vào công cụ → kiểm tra cột Năm của từng sheet → chọn Xác nhận.",
    result: "Hiển thị danh sách năm và số dòng dữ liệu tương ứng. Dữ liệu gốc được giữ nguyên trong suốt quá trình xử lý.",
    details: (
      <>
        <h4>Hồ sơ sản phẩm là gì?</h4>
        <p>Mỗi sản phẩm (urê, DAP, axit, muối vô cơ…) có đặc thù riêng: phân khúc theo tiêu chí nào, từ khóa nào, hàng nào lẫn vào cần loại, đơn vị tính lạ, khoảng giá hợp lý, quy tắc lọc giá trị ngoại lai. <b>Hồ sơ sản phẩm</b> lưu toàn bộ các lựa chọn đó thành một gói để dùng lại và chia sẻ.</p>
        <ul>
          <li><b>Mỗi người tự tạo hồ sơ của mình</b>: Quản lý hồ sơ → Tạo hồ sơ trống → soạn phân khúc ở bước 10 → Lưu. Công cụ không kèm sẵn dữ liệu hay bộ từ khóa của dự án nào.</li>
          <li><b>Trên máy này</b>: hồ sơ lưu trong trình duyệt bạn đang dùng — có thể mất khi xóa dữ liệu trình duyệt, nên <b>Xuất tệp hồ sơ</b> (.json) để giữ lâu dài và gửi đồng nghiệp (họ dùng Nhập tệp hồ sơ).</li>
          <li><b>Thư viện chung</b> (tùy chọn): tệp hồ sơ đặt trong thư mục <code>profiles/</code> của mã nguồn sẽ hiện cho cả nhóm sau lần triển khai kế tiếp.</li>
          <li>Công cụ tự mở lại hồ sơ bạn dùng lần trước.</li>
        </ul>
        <h4>Quy tắc nhận diện năm</h4>
        <ul>
          <li>Ưu tiên năm trong <b>tên trang tính</b>: "2023", "2023_Data", "Data2023", "Sheet 2023" đều nhận được.</li>
          <li>Nếu không trang tính nào mang năm, lấy năm trong <b>tên file</b> (ví dụ: <code>Urea_2024.xlsx</code>) cho trang tính có nhiều dòng nhất.</li>
          <li>Nhiều nguồn cùng một năm (ví dụ: tệp Q1, Q2) sẽ được <b>gộp</b> thành một năm.</li>
          <li><b>Một trang tính chứa nhiều năm</b> (ví dụ: 2020 – T10/2026 trong một bảng): công cụ tìm cột Ngày (hoặc cột Năm) và <b>tách từng dòng theo năm của nó</b>. Dòng không đọc được ngày được báo riêng và không đưa vào xử lý.</li>
          <li>Không giới hạn số năm. Năm chưa đủ 12 tháng (ví dụ: 2026 chỉ có T1–T10) được gắn nhãn <b>“2026 (T1–T10)”</b> trên giao diện và báo cáo để tránh so sánh nhầm tổng lượng/trị giá với năm đủ.</li>
          <li>Có thể sửa năm, bật/tắt từng trang tính trước khi xác nhận.</li>
        </ul>
        <h4>Dòng tiêu đề</h4>
        <p>Công cụ dò trong 30 dòng đầu, chọn dòng có nhiều ô chữ và khớp tên cột quen thuộc nhất — tệp có dòng tiêu đề báo cáo phía trên vẫn đọc đúng.</p>
        <h4>Bảo mật & dung lượng</h4>
        <ul>
          <li>Dữ liệu được xử lý <b>ngay trong trình duyệt</b>, không gửi lên máy chủ.</li>
          <li>Tham khảo: khoảng 70.000 dòng đọc trong ~4 giây, xử lý toàn bộ ~10 giây. Với dữ liệu &gt; 500.000 dòng nên dùng Chrome/Edge 64-bit và đóng bớt tab.</li>
        </ul>
      </>
    ),
  },
  schema: {
    tagline: "Ghép các cột trong file dữ liệu với trường tương ứng của công cụ, chẳng hạn Mô tả hàng hóa, Người mua, Trị giá và Đơn vị tính.",
    purpose: "Quy về cùng một hệ thống tên trường để công cụ nhận diện đúng dữ liệu giữa các năm, kể cả khi tên cột trong từng file khác nhau.",
    todo: "Kiểm tra các gợi ý ánh xạ tự động. Cột viền đỏ là trường chưa được ghép. Nếu tên cột thay đổi giữa các năm, hãy điều chỉnh tại bảng của từng năm.",
    result: "Sau khi xác nhận, cấu hình ánh xạ của từng năm sẽ được lưu để sử dụng thống nhất ở các bước tiếp theo.",
    details: (
      <>
        <h4>Trường bắt buộc</h4>
        <p>Mô tả hàng hóa · Nhà cung cấp · Người mua · Nước xuất xứ · Nước nhập khẩu · Đơn giá · Trị giá · Khối lượng/Số lượng · Đơn vị tính.</p>
        <h4>Trường tùy chọn (nên có)</h4>
        <ul>
          <li><b>Nguồn dữ liệu</b> — bật tính năng phát hiện giao dịch trùng giữa các nguồn (ví dụ: hai nhà cung cấp dữ liệu cùng ghi một lô hàng).</li>
          <li><b>Ngày</b> — xác định <b>kỳ dữ liệu</b> từng năm (đánh dấu năm chưa đủ 12 tháng, ví dụ: “2026 (T1–T10)”), so khớp trùng nguồn (lệch ≤ 10 ngày), kiểm tra ngày khác năm của trang tính. Đọc được dd/mm/yyyy, mm/dd/yyyy (tự nhận theo cả cột), yyyy-mm-dd, ngày Excel, 20240315, T10/2026.</li>
          <li><b>Mã HS</b> — giữ lại trong tệp xuất để lọc; có thể dùng làm từ khóa phân khúc (bước 11 → “Mô tả + mã HS”).</li>
        </ul>
        <h4>Gợi ý tự động hoạt động thế nào</h4>
        <p>Chấm điểm từng cặp (trường, cột): trùng tên hoàn toàn &gt; bắt đầu/kết thúc bằng tên quen thuộc &gt; chứa tên quen thuộc. Cột điểm cao được gán trước, mỗi cột chỉ dùng cho một trường ⇒ "Unit Price" không bị nhận nhầm là "Unit".</p>
      </>
    ),
  },
  quality: {
    tagline: "Kiểm tra chất lượng dữ liệu trước khi bắt đầu xử lý.",
    purpose: "Công cụ rà soát các vấn đề thường gặp như ô trống, số được lưu dưới dạng văn bản, giá trị thay thế, đơn vị tính hoặc quốc gia chưa nhận diện và dòng trùng lặp; đồng thời xác định kỳ dữ liệu của từng năm.",
    todo: "Chọn Chạy để xem kết quả kiểm tra và các cảnh báo. Bạn không cần chỉnh sửa file gốc; những vấn đề có thể xử lý sẽ được xử lý ở các bước tiếp theo.",
    result: "Kết quả gồm chất lượng dữ liệu theo từng năm; tình trạng đủ hoặc thiếu 12 tháng; danh sách đơn vị tính và quốc gia cần kiểm tra; cùng thông tin về các dòng trùng lặp.",
    details: (
      <>
        <h4>Đọc số "chịu lỗi"</h4>
        <p>Công cụ đọc được: <code>1,234.56</code> · <code>1.234,56</code> · <code>12 500</code> · <code>$1,200</code> · <code>1200 USD</code> · <code>(123)</code> = −123. Ô chữ như "N/A" được đếm là <b>Chữ</b>.</p>
        <h4>Dòng đủ dữ liệu cốt lõi</h4>
        <p>Có người mua + mô tả + giá trị tính được (Trị giá, hoặc Đơn giá × Lượng) + lượng &gt; 0 + đơn vị.</p>
        <h4>Ngày giao dịch & kỳ dữ liệu</h4>
        <p>Thứ tự <b>ngày/tháng</b> được xác định theo cả cột (có ô 25/03 ⇒ cột là dd/mm; mọi ô ≤ 12 ⇒ mặc định dd/mm). Kỳ dữ liệu = ngày đầu → ngày cuối của từng năm. Năm không đủ tháng 1 → 12 được gắn nhãn, ví dụ: <b>“2026 (T1–T10)”</b>: tổng lượng/trị giá của năm đó không so sánh trực tiếp với năm đủ.</p>
        <p>“Khác năm của trang tính” = dòng có ngày thuộc năm khác năm của trang tính (ví dụ: trang tính 2023 lẫn vài dòng cuối 12/2022) — dòng vẫn được tính vào năm của trang tính; muốn tách, quay lại bước 1 chọn “Tách theo cột Ngày”.</p>
        <h4>Dòng trùng lặp</h4>
        <p>Giống hệt một dòng trước đó (cùng năm) trên <b>mọi trường đã ánh xạ</b>. Chỉ đánh dấu — có loại hay không do bạn chọn ở bước 13 (mặc định giữ, vì nhiều lô hàng giống nhau trong cùng tháng là bình thường).</p>
      </>
    ),
  },
  backfill: {
    tagline: "Tự tính giá trị còn thiếu khi có đủ hai trong ba trường: Đơn giá, Trị giá và Lượng.",
    purpose: "Giúp tận dụng dữ liệu hiện có: một dòng vẫn có thể được sử dụng nếu thiếu một trong ba trường Đơn giá, Trị giá hoặc Lượng.",
    todo: "Chọn Chạy để bổ sung dữ liệu. Không cần thiết lập thêm thông số.",
    result: "Kết quả gồm ba cột đã được bổ sung khi có thể: Đơn giá (sạch), Trị giá (sạch), Lượng (sạch), kèm thông tin về trường được tính bổ sung.",
    details: (
      <>
        <h4>Công thức</h4>
        <F>{"Thiếu Đơn giá  →  Đơn giá = Trị giá / Lượng\nThiếu Trị giá  →  Trị giá = Đơn giá × Lượng\nThiếu Lượng    →  Lượng   = Trị giá / Đơn giá"}</F>
        <ul>
          <li>Chỉ bổ sung khi thiếu <b>đúng một</b> trường và hai trường kia &gt; 0.</li>
          <li>Ô trống, bằng 0, số âm, chữ đều coi là "thiếu".</li>
          <li><b>Dữ liệu gốc giữ nguyên</b> (bản cũ ghi đè lên cột gốc — đã sửa).</li>
        </ul>
      </>
    ),
  },
  validate: {
    tagline: "Đối chiếu số liệu sau khi đã làm sạch: Đơn giá × Lượng với Trị giá, và giao dịch trùng giữa các nguồn.",
    purpose: "Đánh dấu các dòng có số liệu chưa khớp (nhập sai giá trị, đơn vị tính, ánh xạ nhầm cột) và các lô hàng bị ghi hai lần ở hai nguồn — trên số liệu đã đồng nhất về tên doanh nghiệp và đơn vị tấn.",
    todo: "Chọn ngưỡng chênh lệch cho phép (mặc định 30%), giữ bật phát hiện trùng nguồn, sau đó chọn Chạy để thực hiện đối chiếu.",
    result: "Trạng thái đối chiếu từng dòng (Hợp lệ / Lệch vượt ngưỡng / Thiếu dữ liệu / Đã bổ sung), tỷ lệ lệch, đơn giá gốc quy đổi về USD/tấn và danh sách giao dịch nghi trùng giữa các nguồn.",
    details: (
      <>
        <h4>Vì sao đối chiếu sau khi làm sạch</h4>
        <p>Bước 4–6 đã thống nhất tên doanh nghiệp, bổ sung số liệu thiếu và quy đổi lượng về tấn. Đối chiếu trên số liệu này giúp: so được đơn giá gốc với đơn giá USD/tấn theo cùng một đơn vị; nhận ra trùng nguồn kể cả khi một nguồn ghi 25.000 KGM còn nguồn kia ghi 25 TNE, hoặc tên doanh nghiệp viết khác nhau.</p>
        <h4>Công thức</h4>
        <F>{"Tỷ lệ lệch = |Đơn giá × Lượng − Trị giá| / Trị giá\nLệch > ngưỡng  ⇒  \"Lệch vượt ngưỡng\"\nĐơn giá gốc quy đổi (USD/tấn) = Đơn giá ÷ Hệ số quy đổi  ↔  Đơn giá (USD/tấn) = Trị giá / Lượng (tấn)"}</F>
        <ul>
          <li>Dòng vừa được bổ sung ở bước 5 luôn khớp theo cấu trúc ⇒ ghi "Đã bổ sung (không kiểm được)" thay vì "Hợp lệ" để không tô đẹp số liệu.</li>
          <li>Đơn giá gốc quy đổi chênh nhiều lần so với Đơn giá (USD/tấn) ⇒ cột Đơn giá gốc hoặc đơn vị không tin cậy; Đơn giá (USD/tấn) tính từ Trị giá / Lượng (tấn) nên không bị ảnh hưởng.</li>
          <li>Kết quả dùng ở bước 13: quy tắc mặc định chỉ loại dòng VỪA lệch giá trị VỪA giá trị ngoại lai IQR.</li>
        </ul>
        <h4>Trùng giữa các nguồn</h4>
        <p>Cùng năm · cùng doanh nghiệp mua hoặc doanh nghiệp bán (mã nhóm từ bước 4) · cùng Lượng (tấn) · cùng trị giá (±1 USD) · ngày lệch ≤ 10 ngày · nhưng khác "Nguồn dữ liệu" ⇒ đánh dấu bản ghi ưu tiên thấp hơn (giữ bản ghi nhập khẩu của chính nước mua). Rất hay gặp khi gộp dữ liệu hải quan của nước mua với dữ liệu xuất khẩu hoặc dữ liệu tổng hợp của bên thứ ba — nếu không loại, giá trị của nhà nhập khẩu bị đếm đôi. Loại hay không loại khỏi xếp hạng & chỉ số: chọn ở bước 8.</p>
      </>
    ),
  },
  units: {
    tagline: "Quy đổi lượng hàng về cùng đơn vị tấn (MT) và tính đơn giá theo USD/tấn.",
    purpose: "Đưa các đơn vị tính khác nhau như KGM, TNE, LBS, bao hoặc chai về cùng một cơ sở để có thể so sánh giá giữa các nguồn dữ liệu.",
    todo: "Chọn Chạy để xem danh sách đơn vị tính. Nhập hệ số quy đổi cho những đơn vị chưa có (ví dụ: TND = 1), sau đó chạy lại để áp dụng.",
    result: "Kết quả bổ sung các trường Lượng (tấn), Đơn giá (USD/tấn), Hệ số quy đổi và Trạng thái quy đổi cho từng dòng dữ liệu.",
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
        <p>Sản phẩm lỏng tính theo lít/m³: chọn <b>Tùy chỉnh…</b> và nhập hệ số = khối lượng riêng (tấn/m³) ÷ 1.000 cho lít (ví dụ: dung dịch 1,2 t/m³ ⇒ LTR = 0,0012). Hệ số được lưu trong hồ sơ sản phẩm.</p>
        <h4>Kiểm tra giá/tấn phi lý (nghi sai đơn vị)</h4>
        <p><b>Khoảng giá hợp lý</b> có thể đặt theo đặc thù sản phẩm (ví dụ: phân bón 80–2.000 USD/t; hóa chất tinh khiết cao hơn nhiều) — giá trị này lưu trong hồ sơ sản phẩm. Để trống thì công cụ tự tính như sau:</p>
        <p>Giá/tấn thấp hơn 1/50 hoặc cao hơn 2.000 lần giá tham chiếu ⇒ đánh dấu "Thấp/Cao phi lý – nghi sai đơn vị", loại khỏi mẫu IQR và khỏi chỉ số (bất kể quy tắc giá trị ngoại lai). Ví dụ điển hình: lượng ghi 500.000 với đơn vị “TNE” nhưng thực chất là kg ⇒ giá chỉ ~0,1 USD/tấn và làm phình tổng lượng hàng trăm nghìn tấn. Các dòng này vẫn “khớp” Đơn giá × Lượng nên quy tắc AND không bao giờ loại được, và IQR tuyến tính cũng bỏ sót vì ngưỡng dưới âm.</p>
      </>
    ),
  },
  entity: {
    tagline: "Gộp các tên gọi khác nhau nhưng cùng chỉ một doanh nghiệp, áp dụng thống nhất cho dữ liệu của tất cả các năm.",
    purpose: "Một doanh nghiệp có thể xuất hiện dưới nhiều tên do khác biệt về ngôn ngữ, cách viết tắt hoặc lỗi chính tả. Chuẩn hóa và gộp đúng tên giúp kết quả thống kê, xếp hạng chính xác hơn.",
    todo: "Bạn có thể giữ nguyên thiết lập mặc định và chọn Chạy. Sau đó, lọc các trường hợp Cần rà soát để kiểm tra; nếu cần, cập nhật kết quả bằng file từ điển.",
    result: "Kết quả gồm từ điển tên doanh nghiệp mua và bán, với mã nhóm, tên chuẩn hóa, độ tin cậy và cảnh báo rủi ro — dùng cho đối chiếu trùng nguồn (bước 7) và xếp hạng (bước 8).",
    details: (
      <>
        <h4>Các tầng so khớp</h4>
        <ol>
          <li><b>Placeholder</b>: TO ORDER, NONE, N/A, ô trống, "THEO LỆNH"… ⇒ [Không xác định], không tạo doanh nghiệp.</li>
          <li><b>Từ điển người dùng</b> (nếu tải lên) — ưu tiên tuyệt đối.</li>
          <li><b>Khóa lõi</b>: bỏ dấu, chuyển chữ Kirin sang Latin, bỏ hình thức pháp lý (CO LTD, JSC, TNHH, CTCP, MTV, PT, SDN BHD, OOO…), dịch cụm tiếng Việt sang tiếng Anh (THƯƠNG MẠI→TRADING, PHÂN BÓN→FERTILIZER…), chuẩn đồng nghĩa (CHEMICALS→CHEMICAL…). Từ chung được sắp xếp, <b>phần tên riêng giữ nguyên thứ tự</b> ⇒ "Phân bón Phú Bình" ≡ "Phu Binh Fertilizer" nhưng "Phú Hưng" ≠ "Hưng Phú". Độ tin cậy: <b>Chính xác / Cao</b>.</li>
          <li><b>Trùng phần tên riêng</b> (bỏ từ chung): "Lam Hong Co., Ltd." ≡ "Lam Hong Trading Company". Chặn tên riêng quá phổ biến (&gt; 6 biến thể). Độ tin cậy <b>Trung bình</b> ⇒ Cần rà soát.</li>
          <li><b>Lỗi chính tả</b>: khoảng cách Levenshtein trên phần tên riêng ≥ 10 ký tự, tối đa 1 lỗi (10–19 ký tự) hoặc 2 lỗi (≥ 20 ký tự). Độ tin cậy <b>Thấp/Trung bình</b> ⇒ Cần rà soát.</li>
        </ol>
        <h4>Quy tắc nhóm theo quốc gia</h4>
        <ul>
          <li>Doanh nghiệp mua: luôn nhóm theo tên + nước nhập khẩu.</li>
          <li>Doanh nghiệp bán: mặc định nhóm <b>chỉ theo tên</b> vì "Nước xuất xứ" là xuất xứ HÀNG HÓA, không phải trụ sở người bán (một trader Singapore bán hàng xuất xứ Trung Quốc và Nga). Có thể bật lại kiểu cũ.</li>
        </ul>
        <h4>Tên hiển thị</h4>
        <p>Chọn từ một biến thể <b>có thật</b> trong dữ liệu (ưu tiên tên tiếng Anh, giá trị lớn, không bị cắt cụt), chỉ làm sạch hậu tố pháp lý và kiểu chữ — không ghép/dịch ra tên không tồn tại.</p>
        <h4>Vì sao làm đầu tiên</h4>
        <p>Chuẩn hóa tên là bước đầu của giai đoạn làm sạch: mã nhóm doanh nghiệp thống nhất mọi năm được dùng ngay ở bước 7 để nhận ra cùng một lô hàng ghi ở hai nguồn với tên viết khác nhau (tiếng Việt / tiếng Anh), rồi ở bước 8 để xếp hạng.</p>
        <h4>Sửa kết quả gộp</h4>
        <p>Xuất "Tệp rà soát tên doanh nghiệp" → điền cột <b>Tên chuẩn hóa (sửa)</b> (cùng tên ⇒ gộp; tên khác ⇒ tách; <code>#LOAI</code> ⇒ coi là không xác định) → tải lại → Chạy lại. Tệp này dùng lại được cho các lần cập nhật dữ liệu sau.</p>
      </>
    ),
  },
  ranking: {
    tagline: "Xác định các doanh nghiệp đóng góp phần lớn tổng trị giá hoặc lượng hàng để lập danh sách ưu tiên nghiên cứu.",
    purpose: "Xác định các doanh nghiệp quan trọng theo từng năm và toàn giai đoạn, với nhiều phạm vi phân tích: toàn cầu, Việt Nam hoặc từng châu lục.",
    todo: "Chọn ngưỡng tỷ trọng (mặc định 80%) và chỉ tiêu phân tích (trị giá hoặc lượng), sau đó chọn Chạy và tải file danh sách doanh nghiệp cần nghiên cứu.",
    result: "Kết quả gồm bảng xếp hạng, biểu đồ Pareto, danh sách Top doanh nghiệp theo từng phạm vi và danh sách doanh nghiệp cần nghiên cứu sâu hơn.",
    details: (
      <>
        <h4>Từng năm & cả giai đoạn</h4>
        <p>Mỗi năm xếp hạng riêng. Khi có từ 2 năm, thẻ <b>Cả giai đoạn</b> cộng dồn giá trị mọi năm của từng doanh nghiệp (mã nhóm doanh nghiệp thống nhất giữa các năm) — trả lời câu hỏi “ai lớn nhất trong cả giai đoạn 2020 – T10/2026”. Tệp nghiên cứu có thêm trang tính “Cả giai đoạn”.</p>
        <h4>Cách tính</h4>
        <F>{"Giá trị doanh nghiệp (năm, phạm vi) = Σ Trị giá (sạch) các dòng của doanh nghiệp\nTỷ trọng = Giá trị doanh nghiệp / Tổng giá trị doanh nghiệp xác định được trong phạm vi\nThuộc Top ⇔ lũy kế TRƯỚC doanh nghiệp đó < ngưỡng"}</F>
        <ul>
          <li>Gộp theo <b>mã nhóm doanh nghiệp</b> từ bước 4 (bản cũ gộp theo chuỗi tên + chuỗi quốc gia ⇒ "Viet Nam" và "VIETNAM" bị tách).</li>
          <li>Placeholder bị loại khỏi mẫu số; tỷ trọng giá trị "không xác định" được báo riêng để bạn biết độ phủ.</li>
          <li>Dòng nghi trùng nguồn khác không được cộng (nếu bật).</li>
          <li>Phạm vi: Nhập khẩu (toàn cầu, Việt Nam, từng châu lục) · Xuất khẩu (toàn cầu, bán vào Việt Nam, từng châu lục xuất xứ).</li>
          <li>Xếp hạng theo <b>khối lượng</b> hữu ích khi nhiều nguồn vận đơn (BL) không có trị giá, nhưng lưu ý dữ liệu BL có thể trùng với hải quan.</li>
        </ul>
      </>
    ),
  },
  industry: {
    tagline: "Bổ sung thông tin ngành và phân khúc ngành cho doanh nghiệp dựa trên kết quả nghiên cứu.",
    purpose: "Khi mô tả hàng hóa chưa đủ thông tin để phân loại, có thể sử dụng ngành hoạt động của doanh nghiệp mua làm căn cứ bổ sung.",
    todo: "Tải danh sách doanh nghiệp cần nghiên cứu ở Bước 8, điền thông tin Ngành và Phân khúc ngành, rồi tải file lên công cụ và chọn Áp dụng. Nếu không có dữ liệu bổ sung, chọn Bỏ qua.",
    result: "Kết quả bổ sung các cột Ngành, Phân khúc ngành và Cách khớp cho từng dòng; đồng thời hiển thị danh sách doanh nghiệp thuộc nhóm Top còn thiếu thông tin ngành.",
    details: (
      <>
        <ul>
          <li>Đọc <b>mọi trang tính</b> của <b>mọi file</b> (bản cũ chỉ đọc trang tính đầu ⇒ mất dữ liệu các năm sau).</li>
          <li>Nhận cả tiêu đề tiếng Anh của bản cũ (<code>Purchaser_Standardize | Purchasing Country | Industry | Industry Segment</code>) lẫn tiếng Việt.</li>
          <li>So khớp theo <b>khóa lõi</b> của tên + quốc gia ⇒ tệp nghiên cứu cũ của bản cũ vẫn dùng được dù tên hiển thị đã thay đổi.</li>
          <li>Ngành là thuộc tính của doanh nghiệp ⇒ mặc định gán cho mọi dòng của doanh nghiệp (bản cũ chỉ gán cho dòng thuộc Top năm đó). Có tùy chọn quay về kiểu cũ.</li>
          <li>Cùng doanh nghiệp có nhiều ngành khác nhau giữa các tệp ⇒ dùng dòng tải sau, ghi vào danh sách xung đột.</li>
        </ul>
      </>
    ),
  },
  keywords: {
    tagline: "Tạo bộ phân khúc và từ khóa ngay trong công cụ, đồng thời xem trước phạm vi dữ liệu được nhận diện trước khi chạy phân loại.",
    purpose: "Xây dựng định nghĩa phân khúc theo mục tiêu nghiên cứu, chẳng hạn mục đích sử dụng, cấp chất lượng hoặc mã HS. Bạn có thể chủ động điều chỉnh tiêu chí phân loại.",
    todo: "Tại thẻ Soạn, cập nhật phân khúc và từ khóa → xem trước kết quả nhận diện và các gợi ý → bổ sung từ khóa phù hợp → chọn Áp dụng → lưu vào hồ sơ.",
    result: "Kết quả gồm bộ phân khúc dùng cho bước Phân loại, tỷ trọng trị giá đã được phân loại và danh sách từ khóa chưa khớp với dòng dữ liệu nào.",
    details: (
      <>
        <h4>Cách soạn</h4>
        <ul>
          <li>Mỗi thẻ là một phân khúc: tên + danh sách từ khóa (mỗi dòng một từ/cụm từ) + từ khóa loại trừ riêng.</li>
          <li><code>GALVANIZ*</code> — khớp mọi từ bắt đầu bằng GALVANIZ (GALVANIZING, GALVANIZED…).</li>
          <li>Loại trừ riêng: mô tả có “FEED GRADE” thì không xếp vào phân khúc Phân bón dù có chữ FERTILIZER.</li>
          <li>Thẻ đỏ <b>LOẠI TRỪ</b>: dòng khớp là “Ngoài phạm vi sản phẩm” và bị loại khỏi chỉ số giá — rất cần cho dữ liệu vận đơn, nơi hàng có mô tả gần giống lẫn vào (ví dụ: muối khác gốc, hợp chất cùng họ).</li>
          <li>Thứ tự thẻ dùng để phân xử khi hai phân khúc hòa — dùng mũi tên để sắp xếp.</li>
        </ul>
        <h4>Xem trước độ phủ & gợi ý từ khóa</h4>
        <p>Chạy bộ phân khúc đang soạn trên toàn bộ dữ liệu (không đổi kết quả hiện có): tỷ lệ trị giá được phân loại, từng phân khúc chiếm bao nhiêu, mô tả chưa phân loại lớn nhất. <b>Gợi ý</b> là các từ/cụm 2 từ xuất hiện nhiều (theo trị giá) trong mô tả chưa phân loại, đã bỏ từ chung chung (bao bì, đơn vị, số…) và từ có ở hơn một nửa số mô tả (thường là tên sản phẩm). Chọn phân khúc ở cột “Thêm vào” để thêm ngay.</p>
        <h4>Nhập / xuất Excel</h4>
        <p>Vẫn dùng được tệp kiểu cũ: <b>STT | Phân khúc 1 | Phân khúc 2 | … | LOẠI TRỪ</b>, từ khóa liệt kê dưới mỗi cột, <code>-</code> ở đầu là loại trừ riêng. Bộ đang soạn cũng xuất được ra Excel theo đúng định dạng này.</p>
      </>
    ),
  },
  classify: {
    tagline: "Phân loại từng giao dịch vào phân khúc phù hợp.",
    purpose: "Tạo trường Phân khúc cuối cùng để làm cơ sở cho các phân tích tiếp theo về giá và thị phần.",
    todo: "Chọn phương pháp phân loại phù hợp với mục tiêu nghiên cứu, sau đó chọn Chạy. Kiểm tra mục Mô tả chưa phân loại để bổ sung từ khóa tại Bước 10 nếu cần.",
    result: "Kết quả gồm các trường Phân khúc cuối cùng, Cách phân loại và Chi tiết từ khóa khớp, cùng thống kê về mức độ khớp của từng từ khóa.",
    details: (
      <>
        <h4>Cách xác định phân khúc (theo ý đồ nghiên cứu)</h4>
        <ul>
          <li><b>Từ khóa trước, ngành doanh nghiệp dự phòng</b> (mặc định): phân khúc theo mô tả hàng hóa; dòng không khớp thì lấy ngành của doanh nghiệp mua.</li>
          <li><b>Ngành doanh nghiệp trước, từ khóa dự phòng</b>: khi câu hỏi là “ai mua, dùng vào ngành nào” và đã có Industry Master.</li>
          <li><b>Chỉ theo từ khóa</b> hoặc <b>Chỉ theo ngành của doanh nghiệp mua</b>: tách bạch hoàn toàn hai cách tiếp cận.</li>
          <li>Ở mọi cách, cột <b>LOẠI TRỪ</b> luôn có hiệu lực trước (hàng ngoài phạm vi không bao giờ vào chỉ số).</li>
        </ul>
        <F>{"Mặc định:\n1. Khớp cột LOẠI TRỪ → Ngoài phạm vi sản phẩm\n2. Khớp từ khóa phân khúc → Phân khúc theo từ khóa\n3. Không khớp, doanh nghiệp có ngành → Phân khúc ngành (dự phòng)\n4. Còn lại → Chưa phân loại"}</F>
        <h4>Khớp theo mã HS</h4>
        <p>Chọn “Mô tả + mã HS” để nối mã HS (chỉ phần chữ số) vào mô tả khi so khớp ⇒ dùng được từ khóa như <code>310230*</code> để tách phân khúc theo mã HS chi tiết.</p>
        <h4>Khi mô tả khớp nhiều phân khúc</h4>
        <p>Chọn phân khúc có <b>nhiều từ khóa khớp nhất</b>; hòa ⇒ phân khúc có từ khóa <b>dài/cụ thể hơn</b>; hòa nữa ⇒ theo thứ tự cột. Hai trường hợp hòa được đánh dấu "nên rà soát".</p>
        <h4>Khớp theo từ nguyên vẹn (mặc định)</h4>
        <p>"UREA" không khớp "THIOUREA", "SA" không khớp "SALT". Không phân biệt hoa/thường, có dấu/không dấu. Chế độ "chứa chuỗi" giữ hành vi bản cũ.</p>
        <h4>Đối chiếu từ khóa – ngành</h4>
        <p>Khi dòng có cả phân khúc từ khóa và phân khúc ngành mà hai giá trị khác nhau ⇒ cột "Đối chiếu từ khóa – ngành" = Khác nhau (nên rà soát).</p>
      </>
    ),
  },
  iqr: {
    tagline: "Phát hiện các mức giá bất thường trong từng phân khúc theo từng năm.",
    purpose: "Hỗ trợ nhận diện những mức giá có thể phát sinh do sai đơn vị tính hoặc lỗi nhập liệu, để phân biệt với biến động giá của thị trường.",
    todo: "Giữ thiết lập mặc định (k = 1,5), hoặc chọn tính toán trên log(giá) nếu khoảng giá trong phân khúc chênh lệch lớn, sau đó chọn Chạy.",
    result: "Kết quả gồm cột Kiểm tra IQR, ngưỡng giá dưới và trên, bảng thống kê và biểu đồ hộp theo từng phân khúc.",
    details: (
      <>
        <F>{"Nhóm = Năm × Phân khúc cuối cùng; giá = Đơn giá (USD/tấn) > 0\nQ1, Q3 tính như Excel QUARTILE.INC (nội suy tuyến tính)\nNgưỡng dưới = Q1 − k × IQR; Ngưỡng trên = Q3 + k × IQR"}</F>
        <ul>
          <li>Bản cũ lấy tứ phân vị bằng <code>sorted[floor(n × 0,25)]</code> — với n nhỏ Q3 có thể bằng giá trị lớn nhất ⇒ không bao giờ phát hiện được giá trị ngoại lai phía trên. Đã thay bằng chuẩn Excel để kết quả kiểm tra lại được trên Excel.</li>
          <li>Nhóm có ít hơn số giá tối thiểu ⇒ "Không đủ dữ liệu" (không kết luận).</li>
          <li>Phân phối giá lệch phải (giá thuốc thử gấp 100 lần giá phân bón) ⇒ ngưỡng dưới âm, chỉ lọc được phía trên. Tùy chọn <b>logarit của giá</b> xử lý tốt hơn.</li>
        </ul>
      </>
    ),
  },
  metrics: {
    tagline: "Tổng hợp lượng, trị giá và giá bình quân của từng phân khúc trước và sau khi lọc giá bất thường.",
    purpose: "Cung cấp số liệu tổng hợp phục vụ báo cáo, gồm quy mô và mặt bằng giá của từng phân khúc qua các năm.",
    todo: "Chọn quy tắc xác định và loại giá bất thường (có thể tham khảo bảng độ nhạy), sau đó chọn Chạy.",
    result: "Kết quả gồm bảng chỉ số trước và sau lọc, biểu đồ so sánh, bảng tổng hợp nhiều năm và thông tin về các dòng được giữ lại hoặc loại bỏ kèm lý do.",
    details: (
      <>
        <F>{"Giá bình quân = Σ Trị giá (sạch) / Σ Lượng (tấn)   (bình quân gia quyền theo lượng)\nChỉ tính dòng có Trị giá > 0 và Lượng (tấn) > 0"}</F>
        <h4>Quy tắc loại giá trị ngoại lai</h4>
        <ul>
          <li><b>AND (mặc định, như bản cũ)</b>: chỉ loại khi VỪA lệch giá trị VỪA giá trị ngoại lai IQR. Rất thận trọng — trên dữ liệu thực tế thường chỉ loại được rất ít dòng.</li>
          <li><b>IQR</b>: loại mọi giá trị ngoại lai IQR — bắt được lỗi sai đơn vị (dòng sai đơn vị thường vẫn "khớp" Đơn giá × Lượng nên AND bỏ sót).</li>
          <li><b>OR</b>: loại khi một trong hai — chặt nhất.</li>
        </ul>
        <p>Luôn loại: dòng Ngoài phạm vi sản phẩm; dòng nghi trùng nguồn khác (nếu bật); dòng trùng lặp hoàn toàn (nếu bật).</p>
      </>
    ),
  },
  export: {
    tagline: "Xuất báo cáo kiểm tra và dữ liệu chi tiết sang Excel.",
    purpose: "Bàn giao kết quả có thể kiểm tra và đối chiếu: mỗi chỉ tiêu đều đi kèm thông tin về cột dữ liệu và nhật ký xử lý liên quan.",
    todo: "Chọn ngôn ngữ hiển thị tiêu đề cột, sau đó tải Báo cáo kiểm tra và file dữ liệu chi tiết của từng năm.",
    result: "Báo cáo gồm 19 sheet, bao gồm từ điển cột và cấu hình xử lý; dữ liệu chi tiết được xuất thành file riêng cho từng năm.",
    details: (
      <>
        <ul>
          <li><b>Báo cáo kiểm toán</b>: tổng quan, chất lượng, bổ sung/đối chiếu, đơn vị, từ điển doanh nghiệp, biến thể tên để sửa, giá trị thay thế, trùng nguồn, nhóm doanh nghiệp Top, ngành, từ khóa, phân loại, IQR, chỉ số, tổng hợp nhiều năm, từ điển cột, cấu hình.</li>
          <li><b>Dữ liệu chi tiết</b>: mọi cột gốc + toàn bộ cột tính toán (bản cũ bỏ mất Lượng (tấn), Đơn giá USD/tấn, Cách phân loại…). Sheet "Sau lọc" chỉ gồm dòng Giữ lại = Có.</li>
          <li>Mỗi dòng có Nguồn – tệp / trang tính / dòng Excel gốc để truy vết.</li>
          <li>Tiêu đề tiếng Anh dùng khi cần tương thích công thức/pivot cũ.</li>
        </ul>
      </>
    ),
  },
  review: {
    tagline: "Hướng dẫn rà soát bộ dữ liệu đã xử lý: dòng nào loại khỏi database, cột nào cần đối chiếu chéo.",
    purpose: "Giúp nhóm thống nhất cách làm sạch lần cuối trên dữ liệu công cụ đã xử lý, để bộ dữ liệu dùng cho báo cáo chỉ gồm giao dịch đúng sản phẩm, không trùng và có số liệu tin cậy.",
    todo: "Xem các trường hợp và số dòng phát sinh, tải Tệp rà soát dữ liệu, điền cột Quyết định cho từng dòng, sửa tại gốc những lỗi sửa được trong công cụ rồi chạy lại.",
    result: "Bảng trường hợp cần rà soát theo ba mức xử lý, các cặp cột cần đối chiếu chéo và tệp Excel rà soát (mỗi trường hợp một trang tính, có cột Quyết định & Ghi chú).",
    details: (
      <>
        <h4>Ba mức xử lý</h4>
        <ul>
          <li><b>Loại khỏi database</b>: hàng ngoài phạm vi sản phẩm, mã HS của mặt hàng khác, giao dịch trùng giữa các nguồn, dòng trùng lặp do nhập hai lần, giao dịch không phải xuất nhập khẩu.</li>
          <li><b>Giữ, không dùng cho giá & lượng</b>: giá/tấn phi lý mà không xác định được đơn vị đúng, không quy đổi được về tấn, thiếu trị giá, lệch giá trị nặng, giá trị ngoại lai IQR (theo quy tắc bước 13).</li>
          <li><b>Giữ, ghi chú</b>: doanh nghiệp không xác định, người mua là đơn vị giao nhận, gộp tên cần rà soát, phân khúc từ khóa khác phân khúc ngành, chưa phân loại, ngày khác năm của trang tính.</li>
        </ul>
        <h4>Nguyên tắc</h4>
        <ul>
          <li>Sửa tại gốc trước khi xóa dòng: hệ số đơn vị (bước 6), từ điển doanh nghiệp (bước 4), từ khóa LOẠI TRỪ (bước 10), mã HS trong hồ sơ — rồi chạy lại để mọi số liệu nhất quán.</li>
          <li>Dòng quyết định loại: tìm theo Nguồn – tệp / trang tính / dòng Excel trong tệp dữ liệu chi tiết; vẫn giữ tệp gốc để truy vết.</li>
          <li>Một dòng có thể thuộc nhiều trường hợp — xử lý theo mức nặng nhất.</li>
          <li>Ghi vào báo cáo số dòng và trị giá đã loại theo từng trường hợp.</li>
        </ul>
      </>
    ),
  },
};
