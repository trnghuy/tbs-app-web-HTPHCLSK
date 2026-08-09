# LUỒNG NGHIỆP VỤ — TBS HTPH-CLSK (Quản lý sự cố chất lượng)

Tài liệu mô tả luồng xử lý 1 vấn đề chất lượng từ lúc báo cáo đến lúc hoàn thành, kèm danh sách
tài khoản test theo từng vai trò. Dùng để test thủ công trên localhost.

## Đang chạy ở đâu

- **Web Admin** (chỉ dành cho Admin): http://localhost:3000/login
- **Mobile App bản web** (dùng cho mọi vai trò còn lại): http://localhost:8082

## Tài khoản test (đều dùng chung khu vực "Xưởng A" để test được trọn luồng)

Mật khẩu cho tất cả tài khoản: **`123456`**

| Mã đăng nhập | Vai trò | Tên | Khu vực | Dùng ở đâu |
|---|---|---|---|---|
| `ADM001` | Admin | Quản trị viên | - | Web Admin (localhost:3000) |
| `NV001` | Nhân viên vận hành (Operator) | Nguyễn Văn Vận Hành | Xưởng A | Mobile app |
| `QA001` | QA | Trần Thị QA | Xưởng A | Mobile app |
| `LL001` | Trưởng line (Line Leader) | Lê Văn Trưởng Line | Xưởng A | Mobile app |
| `CN001` | Công nghệ (Technology) | Phạm Văn Công Nghệ | Xưởng A | Mobile app |
| `TP001` | Trưởng phòng ban (Department Head) | Hoàng Văn Trưởng Phòng | Xưởng A | Mobile app |
| `BT001` | Bảo trì (Maintenance) | Đỗ Văn Bảo Trì | Xưởng A | Mobile app |
| `GD001` | Giám đốc (Director) | Vũ Thị Giám Đốc | Toàn nhà máy (không giới hạn khu vực) | Mobile app |

Dữ liệu nền có sẵn (Admin đã tạo trước, seed sẵn):
- Tổ: **Tổ 1** · Chuyền: **Chuyền 1** (đều thuộc Xưởng A)
- Danh mục lỗi: Lỗi máy móc, Lỗi nguyên vật liệu, Lỗi thao tác
- Danh mục linh kiện: Vòng bi, Dây curoa

> Vì cả 7 tài khoản (trừ Admin) đều cùng khu vực Xưởng A (riêng Giám đốc không giới hạn khu vực),
> bạn có thể test hết cả luồng chỉ với các tài khoản này — không cần Admin tạo thêm gì.

## Luồng xử lý 1 vấn đề — từng bước, ai làm gì, đăng nhập tài khoản nào

### Trang chủ — 2 ô đầu màn hình
Nửa trên Trang chủ chia 2 ô: **trái = "⚠️ Báo cáo vấn đề"**, **phải = "🔍 Tra cứu lỗi SP"**.
- **Tra cứu lỗi SP**: bấm vào → nhập mã PO/SP (gõ 1 phần cũng được, tìm gần đúng) → hiện danh
  sách các vấn đề đã báo cáo trước đó cho mã đó (mô tả, trạng thái, mức độ, nguyên nhân gốc, giải
  pháp nếu đã có) — giúp người dùng biết và ngăn ngừa lỗi lặp lại trước khi báo cáo mới. Tra cứu
  không giới hạn khu vực/vai trò (ai cũng tra được, không chỉ phiếu của mình).

### Bước 1 — Báo cáo vấn đề (bất kỳ ai)
- Đăng nhập mobile bằng **bất kỳ tài khoản nào** (kể cả `NV001`), vào tab **Trang chủ** → bấm
  **"⚠️ Báo cáo vấn đề"**.
- Điền theo thứ tự, **tất cả đều dạng combobox** (bấm mở danh sách, chọn 1 giá trị):
  1. **Khu vực / Xưởng** — bắt buộc, mặc định gợi ý đúng khu vực của người đang đăng nhập nhưng
     có thể đổi sang khu vực khác nếu phát hiện sự cố ở nơi khác. **Đây là khu vực dùng để định
     tuyến thông báo** — chỉ QA/Trưởng line/Công nghệ/Trưởng phòng ban/Bảo trì **cùng khu vực đã
     chọn** mới liên quan tới phiếu này (đã test cách ly: QA khu vực A không thấy phiếu khu vực B).
  2. **Chuyền** — danh sách tự động lọc theo đúng Khu vực vừa chọn (đổi Khu vực thì nạp lại).
  2b. **Tổ** — danh sách tự động lọc theo đúng Chuyền vừa chọn (đổi Chuyền thì nạp lại). Phân cấp
     đúng thực tế: **Khu vực/Xưởng → Chuyền → Tổ** (Tổ nằm trong Chuyền, Chuyền nằm trong Xưởng).
  3. **Danh mục lỗi** — có sẵn lựa chọn **"Khác"**; nếu chọn "Khác" bắt buộc phải mô tả thêm.
  4. **Mức độ nghiêm trọng** — Thấp/Trung bình/Cao/Khẩn cấp, bắt buộc chọn.
  - Cuối cùng: Mã PO (gõ tự do, vd `PO-001`), Mô tả, ảnh (tuỳ chọn) → **Gửi báo cáo**.
- Hệ thống tạo phiếu theo đúng Khu vực đã chọn, trạng thái **"Vừa báo cáo"**, đặt hạn điều tra 15
  phút, và gửi thông báo cho 3 vai trò cùng khu vực đó: QA, Trưởng line, Công nghệ (phiếu mức
  "Khẩn cấp"/"Cao" có tiền tố 🚨/⚠️ trong tiêu đề thông báo).
- Thẻ phiếu (Trang chủ, chi tiết) hiển thị badge màu theo mức độ nghiêm trọng bên cạnh trạng thái.

### Bước 2 — 3 vai trò điều tra 5M+1E (độc lập, mỗi người 1 form riêng, AI hỗ trợ hỏi xoáy 5 Whys)
- Đăng nhập lần lượt bằng **`QA001`**, **`LL001`**, **`CN001`**. Phiếu sự cố sẽ xuất hiện ngay ở
  cả 2 nơi: mục **"Hoạt động sự cố gần đây"** ở Trang chủ (dù không phải người báo cáo, vì cùng
  khu vực) và tab **Thông báo** (thẻ "Cần điều tra 5M+1E").
- Bấm vào phiếu → thấy nút **"🔍 Kiểm tra sự cố"** → bấm vào → nhập Mã PO, ảnh → bấm "Bắt đầu điều
  tra với AI" → AI hỏi xoáy từng câu (kiểu "Tại sao...") tối đa 5 câu, tự chốt nguyên nhân gốc rễ
  theo góc nhìn của người đó và tự phân loại vào 5M+1E → xem lại (có thể sửa) → **Xác nhận & Gửi**.
- Phải nộp **trong vòng 15 phút** kể từ lúc báo cáo, nếu không hệ thống sẽ khoá và báo cho Trưởng
  phòng ban.
- Cần cả 3 tài khoản đăng nhập/nộp riêng lẻ để đủ dữ liệu cho bước tổng hợp nguyên nhân.

### Bước 3 — Trưởng line tổng hợp nguyên nhân & giải pháp (AI hỗ trợ + SOS)
- Khi đủ 3/3 bản 5M+1E, hệ thống gửi thông báo riêng cho **Trưởng line**: thẻ thông báo hiện thêm
  phần **"🧩 Tổng hợp nguyên nhân & Giải pháp"**.
- Đăng nhập **`LL001`**, vào lại phiếu đó → thấy cả 3 bản 5M+1E hiển thị cạnh nhau (mỗi bản có
  khung nổi bật riêng "Nguyên nhân gốc" theo người điền).
- Bấm **"🤖 AI tổng hợp 3 nguyên nhân & gợi ý giải pháp"** → AI đọc cả 3 bản, gộp thành 1 nguyên
  nhân gốc thống nhất + đề xuất giải pháp, tự điền vào form (vẫn chỉnh sửa được).
- **Nếu AI đánh giá sự cố vượt ngoài khả năng xử lý ở xưởng/line** (liên quan ngân sách lớn, cần
  quyết định cấp quản lý cao hơn, hoặc không thuộc phạm vi 5M+1E) → hiện khung cảnh báo kèm nút
  **"🆘 Gửi SOS cho Giám đốc"** — bấm vào gửi thông báo thẳng cho Giám đốc (`GD001`), không phụ
  thuộc khu vực.
- Điền/chỉnh **Nguyên nhân gốc** (bắt buộc) + **Giải pháp đề xuất** (tuỳ chọn) → **Chốt nguyên
  nhân & Giải pháp**.
- Trạng thái phiếu chuyển **"Đã có nguyên nhân"**, thông báo (kèm giải pháp) gửi cho Trưởng line +
  Trưởng phòng ban.

### Bước 4 — Trưởng phòng ban giao việc cho Bảo trì
- Đăng nhập **`TP001`**, vào tab **Công việc** (chỉ Trưởng phòng ban/Bảo trì thấy tab này) → thấy
  phiếu đang chờ giao (kèm nguyên nhân + giải pháp) → bấm vào → tìm nhân viên bảo trì **cùng khu
  vực** (gõ `BT001` hoặc tên) → chọn → **Giao việc**.
- Hệ thống chỉ cho chọn nhân viên bảo trì cùng khu vực Xưởng A (không cho chọn khác khu vực).

### Bước 5 — Bảo trì nhận việc, hệ thống đếm giờ làm việc
- Đăng nhập **`BT001`** → tab **Công việc** → thấy thẻ **"CẦN TRỢ GIÚP"** (người báo cáo, tổ,
  chuyền, mô tả, ảnh, giải pháp đề xuất) → bấm **Nhận việc**.
- Trạng thái → Đang xử lý; thẻ hiện đồng hồ **"⏱ Đang xử lý: HH:MM:SS"** chạy real-time từ lúc
  nhận việc; thông báo gửi cho người báo cáo + Trưởng line kèm giờ nhận.
- Lưu ý: 1 người bảo trì chỉ được nhận 1 việc tại 1 thời điểm.

### Bước 6 — Bảo trì hoàn thành sửa chữa
- Vẫn tài khoản **`BT001`**, vào lại phiếu → điền **Mô tả sửa chữa**, chọn **linh kiện thay thế**
  (thêm nhiều dòng tuỳ ý, mỗi dòng chọn linh kiện + **số lượng** + ghi chú), **ảnh trước** + **ảnh
  sau** sửa chữa → **Hoàn thành**.
- Thông báo gửi cho cả **Trưởng line** (người sẽ xác nhận) và **Trưởng phòng ban** (biết việc đã
  xong); đồng hồ xác nhận bắt đầu chạy (xem bước 7).

### Bước 7a — Trưởng line xác nhận sửa chữa đạt yêu cầu hay chưa (ngay lập tức, không chờ giờ)
- Đăng nhập **`LL001`**, vào lại phiếu → thấy 2 nút **"✅ Xong"** / **"❌ Chưa xong, làm lại"**
  (không cần chờ, bấm được ngay khi bảo trì vừa hoàn thành).
- Nếu bấm **"❌ Chưa xong, làm lại"**: việc quay lại cho **`BT001`** — form "Hoàn thành" hiện lại
  để bảo trì sửa và nộp lại (quay lại Bước 6).
- Nếu bấm **"✅ Xong"**: hệ thống bắt đầu đếm giờ theo dõi 3-48h (Bước 7b), Trưởng phòng ban được
  báo "Đang theo dõi sau sửa chữa".

### Bước 7b — Theo dõi 3-48h → Đóng vấn đề / Kiểm tra lại → Giám đốc nhận thông báo cuối
- Sau khi Trưởng line xác nhận "Xong", phiếu vào giai đoạn theo dõi. Vẫn tài khoản **`LL001`**,
  vào lại phiếu sẽ thấy 2 nút **"Đóng vấn đề"** / **"Kiểm tra lại"** — chỉ bấm được trong khung
  giờ **từ 3 giờ đến 48 giờ** sau khi xác nhận "Xong" ở bước 7a (xem mục "Test nhanh timer" bên
  dưới nếu muốn test ngay không chờ).
- Nếu bấm **"Đóng vấn đề"**: phiếu chuyển trạng thái **"Đã hoàn thành"**, hệ thống gửi thông báo
  **"🎉 Sự cố đã hoàn thành"** cho **Giám đốc** (`GD001`) — tài khoản này không gắn khu vực, nhận
  thông báo hoàn thành của mọi khu vực trong nhà máy. Kết thúc luồng.
- Nếu bấm **"Kiểm tra lại"** (sự cố còn tái diễn trong lúc theo dõi): phiếu quay lại **"Đang điều
  tra"**, mở lại form 5M+1E cho QA/Trưởng line/Công nghệ nộp bổ sung (giữ nguyên lịch sử 5M+1E và
  sửa chữa cũ) — quay lại Bước 2.
- Nếu Trưởng line không bấm gì trong 48h: hệ thống **tự động "Đóng vấn đề"** và cũng báo cho
  Giám đốc.

## Tổng kết ai cần tài khoản gì ở bước nào

| Bước | Vai trò thao tác | Tài khoản |
|---|---|---|
| 1. Báo cáo | Bất kỳ ai | `NV001` (hoặc bất kỳ) |
| 2. Điều tra 5M+1E (AI hỗ trợ) | QA + Trưởng line + Công nghệ | `QA001`, `LL001`, `CN001` |
| 3. Tổng hợp nguyên nhân & giải pháp | Trưởng line | `LL001` |
| 4. Giao việc | Trưởng phòng ban | `TP001` |
| 5. Nhận việc (đếm giờ) | Bảo trì | `BT001` |
| 6. Hoàn thành sửa chữa (kèm số lượng linh kiện) | Bảo trì | `BT001` |
| 7a. Xác nhận sửa chữa Xong/Chưa xong (ngay lập tức) | Trưởng line | `LL001` |
| 7b. Theo dõi 3-48h → Đóng vấn đề / Kiểm tra lại | Trưởng line | `LL001` |
| 8. Nhận thông báo hoàn thành cuối cùng | Giám đốc | `GD001` |

Admin (`ADM001`, web http://localhost:3000) chỉ dùng để quản lý danh mục/nhân sự và xem
Dashboard/Top 5 lỗi — không tham gia luồng xử lý.

### Quản lý Khu vực / Chuyền / Tổ theo từng xưởng (Admin, web)
Phân cấp đúng thực tế: **Khu vực/Xưởng → Chuyền → Tổ**.
- **Danh mục → Chuyền** → "+ Thêm mục": bắt buộc chọn **Khu vực/Xưởng**.
- **Danh mục → Tổ** → "+ Thêm mục": bắt buộc chọn **cả Khu vực/Xưởng lẫn Chuyền** (chọn Khu vực
  trước để lọc ra đúng danh sách Chuyền thuộc khu vực đó, rồi mới chọn Chuyền). Đã test: thiếu
  Chuyền bị chặn tạo, có đủ cả 2 thì tạo thành công và hiện đúng cả 2 cột trong bảng.
- Mục đích: quản lý riêng theo từng xưởng khi có nhiều khu vực (VD: Xưởng A, Xưởng B — mỗi xưởng
  có Chuyền/Tổ riêng, không lẫn lộn), và mobile lọc đúng Chuyền theo Khu vực, đúng Tổ theo Chuyền
  ở form báo cáo.

## Test nhanh các mốc thời gian (tuỳ chọn, không bắt buộc)

Bước 7a không có giới hạn giờ (bấm được ngay). Các mốc còn lại (15 phút điều tra, 3-48h theo dõi
ở bước 7b) mặc định phải chờ thật. Nếu muốn test ngay không chờ, có thể nhờ chỉnh trực tiếp giờ
trong `web-admin/dev.db` (bảng `quality_issues` cột `investigationDeadline`, bảng
`maintenance_tasks` cột `monitoringStartedAt`) rồi tải lại — báo lại nếu cần hỗ trợ việc này.
