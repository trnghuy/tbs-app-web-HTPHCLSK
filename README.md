# Hệ Thống Quản Lý Phản Hồi Sự Cố Chất Lượng & Điều Phối Bảo Trì (TBS HTPH-CLSK)

Hệ thống chuyên sâu dành cho nhà máy sản xuất của **TBS Group**, tự động hoá toàn diện quy trình tiếp nhận, điều tra nguyên nhân gốc rễ 5M+1E bằng AI, giao việc sửa chữa và theo dõi nghiệm thu khép kín 8 bước theo tiêu chuẩn Lean & QA/QC công nghiệp.

---

## 📑 Mục Lục
1. [Kiến Trúc Kỹ Thuật](#-kiến-trúc-kỹ-thuật)
2. [Cấu Trúc Tổ Chức Multi-Tenant & Phân Quyền](#-cấu-trúc-tổ-chức-multi-tenant--phân-quyền)
3. [Quy Trình Nghiệp Vụ 8 Bước Chuẩn Hoá](#-quy-trình-nghiệp-vụ-8-bước-chuẩn-hoá)
4. [Tài Khoản Kiểm Thử Mặc Định](#-tài-khoản-kiểm-thử-mặc-định)
5. [Hướng Dẫn Cài Đặt & Chạy Môi Trường Cục Bộ (Local)](#-hướng-dẫn-cài-đặt--chạy-môi-trường-cục-bộ-local)
6. [Cấu Hình Biến Môi Trường (.env)](#-cấu-hình-biến-môi-trường-env)
7. [Hướng Dẫn Triển Khai Cloudflare (D1, R2, OpenNext)](#-hướng-dẫn-triển-khai-cloudflare-d1-r2-opennext)
8. [Bảo Mật & Kiểm Toán (Security & Audit Trail)](#-bảo-mật--kiểm-toán-security--audit-trail)

---

## 🛠 Kiến Trúc Kỹ Thuật

- **Frontend & Backend API**: [Next.js 16 (App Router)](https://nextjs.org/) + React 19 + TypeScript + Tailwind CSS.
- **Database & ORM**: [Prisma ORM 7.9](https://www.prisma.io/) với kiến trúc **Dual-Engine Multi-Runtime**:
  - *Local*: SQLite (`dev.db`) thông qua `@prisma/adapter-better-sqlite3`.
  - *Production (Edge / Cloudflare)*: Cloudflare D1 Serverless SQL Database qua `@prisma/adapter-d1` & WASM compiler.
- **Trí Tuệ Nhân Tạo (AI)**: [Groq API](https://groq.com/) với mô hình `llama-3.3-70b-versatile` đào sâu 5 Whys hỏi xoáy từng bước và tự động tổng hợp 3 bản 5M+1E song song (Kèm Smart Fallback Engine không gián đoạn khi offline).
- **Thông Báo Đa Kênh (Multi-Channel Dispatcher)**:
  - *Expo Push Notification*: Gửi push alerts tới ứng dụng di động.
  - *FYI Real-time Alerts*: Tự động thông báo cập nhật cho Operator cùng xưởng.
  - *Zalo OA Service*: Tích hợp webhook Zalo Official Account cho quản lý nhà máy.
  - *Email Notification*: Gửi biên bản nghiệm thu và cảnh báo sự cố nghiêm trọng.
- **Kiểm Toán & Lưu Vết (Audit Trail)**: Ghi lại toàn bộ hành động, trạng thái và thời gian của từng cá nhân trong suốt vòng đời sự cố.

---

## 🏢 Cấu Trúc Tổ Chức Multi-Tenant & Phân Quyền

```
Nhà Máy (Factory: KG1, KG2...)
 ├── Khu Vực / Xưởng (Area: Xưởng A, Xưởng B...)
 │    ├── Chuyền Sản Xuất (Production Line: Chuyền 1, Chuyền 2...)
 │    │    └── Tổ (Team: Tổ 1, Tổ 2...)
 └── Phòng Ban Chức Năng (Department: Cơ Điện - Bảo Trì, QA, Công Nghệ...)
      └── Thành Viên & Trưởng Phòng (Department Members & Head)
```

### 8 Vai Trò Người Dùng Trong Hệ Thống:
1. **OPERATOR (Nhân viên vận hành)**: Báo cáo sự cố phát sinh tại chuyền/tổ, đính kèm ảnh chụp hiện trường và mã PO. Nhận thông báo FYI khi có sự cố cùng xưởng.
2. **QA (Quản lý chất lượng)**: Nhận cảnh báo tức thì, tham gia điều tra độc lập 5M+1E cùng AI 5 Whys.
3. **LINE_LEADER (Trưởng line)**: Tham gia điều tra 5M+1E, tổng hợp nguyên nhân gốc rễ và giải pháp từ 3 góc nhìn (hoặc kích hoạt SOS lên Giám đốc), nghiệm thu sửa chữa (Bước 7a) và giám sát cửa sổ 3-48h đóng sự cố (Bước 7b).
4. **TECHNOLOGY (Công nghệ kỹ thuật)**: Tham gia điều tra độc lập 5M+1E từ góc nhìn kỹ thuật, thông số và tiêu chuẩn công nghệ.
5. **DEPARTMENT_HEAD (Trưởng phòng ban)**: Quản lý phòng ban, tiếp nhận nguyên nhân gốc rễ và phân công Kỹ thuật viên bảo trì phù hợp.
6. **MAINTENANCE (Bảo trì / Kỹ thuật viên)**: Nhận thông báo việc, bấm "Nhận việc" (kích hoạt đồng hồ bấm giờ `⏱ HH:MM:SS`), thực hiện sửa chữa, nộp báo cáo kèm ảnh trước/sau và danh mục linh kiện thay thế.
7. **DIRECTOR (Giám đốc nhà máy)**: Tiếp nhận cảnh báo SOS khẩn cấp vượt cấp từ Trưởng line, nhận chứng nhận hoàn thành khi sự cố được giải quyết thành công trên toàn nhà máy.
8. **ADMIN (Quản trị viên)**: Quản trị danh mục hệ thống, nhà máy, phòng ban, nhân sự và phân quyền qua Web Admin (`/admin`).

---

## 🔄 Quy Trình Nghiệp Vụ 8 Bước Chuẩn Hoá

| Bước | Hành Động | Vai Trò Thực Hiện | Hệ Thống Tự Động / AI |
|:---|:---|:---|:---|
| **1. Báo cáo** | Tạo phiếu sự cố (PO, Xưởng, Chuyền, Tổ, Ảnh, Mức độ) | `OPERATOR` / Mọi role | Push alert tới QA, Trưởng line, Công nghệ + FYI Operator |
| **2. Điều tra 5M+1E** | Nộp 3 bản điều tra độc lập (Con người, Máy móc, Vật liệu, Phương pháp, Đo lường, Môi trường) | `QA`, `LINE_LEADER`, `TECHNOLOGY` | Đếm ngược 15 phút, Chat AI 5 Whys hỏi xoáy tự động |
| **3. Chốt nguyên nhân** | Tổng hợp 3 bản điều tra, chốt nguyên nhân gốc & giải pháp (hoặc bấm SOS) | `LINE_LEADER` | AI Llama-3.3 đọc đối chiếu 3 bản, phát hiện bất thường |
| **4. Giao việc** | Phân công Kỹ thuật viên xử lý | `DEPARTMENT_HEAD` | Gửi Push & Notification trực tiếp cho KTV được chỉ định |
| **5. Nhận việc** | Bấm nút nhận việc tại hiện trường | `MAINTENANCE` | Kích hoạt bộ đếm thời gian sửa chữa `⏱ HH:MM:SS` |
| **6. Báo cáo sửa chữa** | Điền chi tiết sửa chữa, chọn linh kiện thay thế, tải ảnh Trước/Sau | `MAINTENANCE` | Chuyển trạng thái phiếu, thông báo cho Trưởng line nghiệm thu |
| **7a. Nghiệm thu tức thì** | Kiểm tra kết quả sửa chữa (`✅ Xong` / `❌ Chưa xong`) | `LINE_LEADER` | Nếu Đạt: Bắt đầu đếm giờ theo dõi 3h - 48h. Nếu Chưa: Trả lại KTV |
| **7b. Giám sát & Đóng** | Theo dõi 3h-48h: `Đóng vấn đề` hoặc `Kiểm tra lại (Mở lại 5M+1E)` | `LINE_LEADER` | Khóa mở lại theo dõi tối thiểu 3 tiếng để đảm bảo chất lượng |
| **8. Hoàn tất toàn diện** | Xem báo cáo hoàn tất và bảng chứng nhận | `DIRECTOR` | Gửi thông báo hoàn tất toàn bộ luồng về Giám đốc |

---

## 🔑 Tài Khoản Kiểm Thử Mặc Định

Tất cả tài khoản kiểm thử đều dùng chung mật khẩu: `123456`.

| Mã NV | Họ và Tên | Vai Trò | Phạm Vi / Phòng Ban | Mục Đích Test |
|:---|:---|:---|:---|:---|
| `ADM001` | Quản trị viên | `ADMIN` | Toàn hệ thống | Quản lý Nhà máy, Phòng ban, Danh mục (`/admin`) |
| `NV001` | Nguyễn Văn Vận Hành | `OPERATOR` | Xưởng A (KG1) | Báo cáo sự cố mới, nhận FYI |
| `QA001` | Trần Thị QA | `QA` | Xưởng A (KG1) · QA | Điều tra 5M+1E độc lập |
| `LL001` | Lê Văn Trưởng Line | `LINE_LEADER` | Xưởng A (KG1) | Điều tra 5M+1E, AI tổng hợp, Nghiệm thu 7a & 7b |
| `CN001` | Phạm Văn Công Nghệ | `TECHNOLOGY` | Xưởng A (KG1) · Công nghệ | Điều tra 5M+1E độc lập |
| `TP001` | Hoàng Văn Trưởng Phòng | `DEPARTMENT_HEAD` | Xưởng A (KG1) · Cơ điện | Giao việc cho KTV Bảo trì |
| `BT001` | Đỗ Văn Bảo Trì | `MAINTENANCE` | Xưởng A (KG1) · Bảo trì | Nhận việc, bấm giờ, báo cáo linh kiện & ảnh |
| `GD001` | Vũ Thị Giám Đốc | `DIRECTOR` | Toàn nhà máy TBS | Xử lý SOS, nhận chứng nhận hoàn thành |

> 💡 **Mẹo test nhanh**: Trên giao diện Web Portal (`/portal/profile`), bạn có thể sử dụng widget **"Chuyển Đổi Nhanh 1-Chạm"** để chuyển đổi tức thì giữa 8 vai trò mà không cần đăng xuất/đăng nhập lại!

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Môi Trường Cục Bộ (Local)

### 1. Yêu Cầu Hệ Thống
- Node.js version 20.x trở lên.
- Trình quản lý gói `npm` hoặc `pnpm`.

### 2. Cài Đặt Dependencies
```bash
cd web-admin
npm install
```

### 3. Khởi Tạo Cơ Sở Dữ Liệu SQLite & Seed Data
```bash
# Đồng bộ Prisma Schema vào SQLite cục bộ (dev.db)
npx prisma db push

# Khởi tạo dữ liệu mẫu (Nhà máy KG1, Phòng ban, 8 tài khoản test, danh mục)
npx tsx prisma/seed.ts
```

### 4. Khởi Chạy Server Local
```bash
npm run dev
```
Truy cập ứng dụng trên trình duyệt:
- **Cổng Web Portal Nghiệp Vụ (Dành cho 7 vai trò)**: `http://localhost:3000/portal` hoặc `http://localhost:3000/login`
- **Cổng Quản Trị Hệ Thống (Admin)**: `http://localhost:3000/admin`

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `web-admin/`:

```env
# URL Cơ sở dữ liệu
DATABASE_URL="file:./dev.db"

# Bảo mật NextAuth & JWT (Bắt buộc trong Production)
AUTH_SECRET="your-strong-random-auth-secret-key-at-least-32-chars"
JWT_SECRET="your-strong-random-jwt-secret-key-for-mobile-auth"

# Tích Hợp Trí Tuệ Nhân Tạo Groq (Tùy chọn - Đã có Fallback Engine thông minh)
GROQ_API_KEY="gsk_your_groq_api_key_here"

# Cấu Hình Thông Báo Đa Kênh (Tùy chọn)
ZALO_OA_ACCESS_TOKEN=""
ZALO_OA_TEMPLATE_ID=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

---

## ☁️ Hướng Dẫn Triển Khai Cloudflare (D1, R2, OpenNext)

Hệ thống được thiết kế tối ưu cho hạ tầng Edge không máy chủ (*Serverless*) của **Cloudflare**:

1. **Cơ sở dữ liệu Serverless D1**:
   ```bash
   npx wrangler d1 create tbs-d1-prod
   npx wrangler d1 execute tbs-d1-prod --file=./prisma/migrations/0_init/migration.sql
   ```
2. **Lưu trữ Ảnh R2 (Tùy chọn thay thế lưu trữ file cục bộ)**:
   ```bash
   npx wrangler r2 bucket create tbs-uploads
   ```
3. **Build & Deploy qua OpenNext Cloudflare**:
   ```bash
   npm run build:worker
   npx wrangler deploy
   ```

---

## 🛡 Bảo Mật & Kiểm Toán (Security & Audit Trail)

1. **Xác thực & Phân quyền chặt chẽ**: Toàn bộ API endpoint được bảo vệ bởi middleware xác thực chữ ký JWT và kiểm tra quan hệ phân cấp Nhà máy / Khu vực.
2. **JWT Secret Hardening**: Môi trường Production sẽ tự động chặn khởi động nếu thiếu `JWT_SECRET` nhằm đảm bảo an toàn tuyệt đối.
3. **Kiểm soát Tải lên Tập tin (Upload File Limit)**: Giới hạn nghiêm ngặt tối đa **5MB/ảnh** với định dạng hợp lệ (JPEG, PNG).
4. **Nhật ký Kiểm toán Toàn diện (Audit Trail)**: Mọi thao tác tạo, chuyển giao, nghiệm thu, đóng hoặc mở lại sự cố đều được ghi nhận vĩnh viễn trong bảng `audit_logs` kèm tên nhân sự và dấu thời gian chính xác đến từng mili-giây.

---
*Bản quyền © 2026 TBS Group. Toàn quyền bảo lưu.*
