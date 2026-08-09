# Hướng Dẫn Xuất File APK Cài Đặt Cho Điện Thoại Tại Xưởng (TBS HTPH-CLSK)

Tài liệu này hướng dẫn chi tiết từng bước để tạo và xuất file cài đặt Android (`.apk`) cho ứng dụng **TBS HTPH-CLSK**, bàn giao và triển khai cho công nhân, QA, Trưởng line, Công nghệ và Bảo trì sử dụng trực tiếp tại nhà xưởng.

---

## 🚀 1. Các Cải Tiến Đã Được Tối Ưu Cho Bản Xuất APK

1. **Khắc phục triệt để lỗi Build**:
   - Đã gỡ bỏ phụ thuộc `googleServicesFile` khi chưa cấu hình Firebase, tránh việc EAS / Gradle báo lỗi thiếu file.
   - Đã cấu hình profile `preview` và `production` trong `eas.json` để **xuất thẳng file `.apk` cài trực tiếp** (thay vì file `.aab` cho Google Play).
2. **Cơ chế Đổi Địa Chỉ Máy Chủ Động (Dynamic Server URL)**:
   - Trên điện thoại thực tế, ứng dụng không thể kết nối tới `localhost:3000`.
   - Ứng dụng đã được tích hợp nút **`⚙️ Cấu hình máy chủ`** ngay tại màn hình Đăng nhập. Khi mang điện thoại sang phân xưởng khác hoặc đổi IP máy chủ, nhân sự chỉ cần gõ lại IP/Domain là kết nối được ngay mà **không cần phải build lại file APK**.
3. **Đầy đủ quyền thiết bị**:
   - Camera (Chụp ảnh hiện trường sự cố & Ảnh trước/sau sửa chữa).
   - Thư viện ảnh (Đính kèm ảnh từ máy).
   - Thông báo Real-time (Push notifications).

---

## 📱 2. Cách Xuất File APK

### Cách 1: Xuất APK qua EAS Build Cloud (Khuyến Nghị — Nhanh Nhất, Không Cần Android Studio)

Đây là cách tiêu chuẩn và thuận tiện nhất của Expo. Toàn bộ quá trình biên dịch diễn ra trên Cloud của Expo, tự động trả về đường link tải file `.apk` và mã QR để quét tải về điện thoại:

#### Bước 1: Cài đặt công cụ EAS CLI
Mở Terminal / PowerShell:
```bash
npm install -g eas-cli
```

#### Bước 2: Đăng nhập tài khoản Expo (Miễn phí)
```bash
eas login
```
*(Nếu chưa có tài khoản, bạn có thể đăng ký nhanh tại [expo.dev/signup](https://expo.dev/signup))*

#### Bước 3: Chạy lệnh xuất file APK
```bash
cd mobile-app
eas build -p android --profile preview
```

> 💡 **Kết quả**: Sau khoảng 5–10 phút, hệ thống sẽ in ra một đường dẫn tải trực tiếp file `.apk` (Ví dụ: `https://expo.dev/artifacts/eas/.../app-preview.apk`) kèm mã QR để quét cài đặt thẳng vào điện thoại tại xưởng.

---

### Cách 2: Tự Biên Dịch APK Cục Bộ (Dành cho máy đã cài Android Studio & SDK)

Nếu máy tính của bạn đã cài đặt sẵn Java JDK 17+ và Android Studio SDK:

```bash
cd mobile-app

# 1. Cài đặt dependencies (nếu chưa cài)
npm install

# 2. Sinh project native Android
npx expo prebuild --platform android

# 3. Biên dịch release APK
cd android
./gradlew assembleRelease
# (Trên Windows PowerShell: .\gradlew.bat assembleRelease)
```

> 📁 **Vị trí file APK xuất ra**:  
> `mobile-app/android/app/build/outputs/apk/release/app-release.apk`

---

## 📲 3. Hướng Dẫn Bàn Giao & Cài Đặt Tại Nhà Xưởng

1. **Gửi file APK tới điện thoại**:
   - Gửi file `.apk` qua Zalo, Google Drive, thẻ nhớ hoặc cáp USB cắm vào điện thoại.
2. **Cài đặt**:
   - Bấm vào file `.apk` trên điện thoại Android -> Chọn **Cài đặt**.
   - Nếu máy hỏi quyền bảo mật: Chọn **Cho phép cài đặt từ nguồn này / Vẫn cài đặt**.
3. **Kết nối vào hệ thống xưởng**:
   - Mở ứng dụng **TBS HTPH-CLSK**.
   - Tại màn hình Đăng nhập, bấm vào dòng chữ: **`⚙️ Máy chủ: ...`** ở phía dưới nút Đăng nhập.
   - Nhập địa chỉ máy chủ xưởng, ví dụ:
     - Dùng mạng LAN xưởng: `http://192.168.1.100:3000` *(thay bằng IP máy chủ chạy web-admin)*
     - Dùng Cloudflare / Domain công ty: `https://htph-clsk.tbsgroup.vn`
   - Bấm **Lưu Cấu Hình**.
4. **Đăng nhập & Sử dụng**:
   - Sử dụng các tài khoản kiểm thử mặc định (Mật khẩu: `123456`):
     - `NV001` (Vận hành)
     - `QA001` (QA)
     - `LL001` (Trưởng line)
     - `CN001` (Công nghệ)
     - `TP001` (Trưởng phòng ban)
     - `BT001` (Bảo trì)
     - `GD001` (Giám đốc)
   - Hoặc bấm chọn nhanh vai trò kiểm thử ở hàng demo phía trên để trải nghiệm toàn bộ luồng 8 bước!

---
*Tài liệu hướng dẫn kỹ thuật TBS Group - Phiên bản 1.0*
