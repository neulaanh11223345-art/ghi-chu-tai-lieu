# Ghi chú & Tra cứu tài liệu · 笔记与资料查询 (v1.0.0)

App riêng cho một người dùng: ghi chú ngay tại máy, tra cứu tài liệu (sổ tay, bản vẽ, quy trình), tra số dây điện theo bản vẽ, và tính DPI, tần số phun, delay cho máy in phun.

- **iPhone:** dùng dạng PWA. Mở bằng Safari rồi chọn "Thêm vào Màn hình chính". Mất mạng vẫn xem và ghi được.
- **Máy tính:** mở cùng địa chỉ bằng trình duyệt.
- **Dữ liệu:** lưu trong **Google Sheet**, đọc và ghi qua Google Apps Script. Tệp tài liệu và ảnh nằm trong Google Drive của chủ sheet, để **riêng tư**, không ai có link xem trực tiếp.
- **Ngôn ngữ:** song ngữ Việt · 中文. Bạn gõ tiếng Việt, app tự dịch sang tiếng Trung. Bản dịch nào bạn đã sửa tay thì app không dịch đè lên nữa.

> **Tài liệu mật:** sổ tay của nhà cung cấp ghi "Confidential Information", còn repo này để công khai. Vì vậy code và bản xem thử chỉ có dữ liệu mẫu `TEST-*`. Sổ tay thật, bản vẽ thật và bảng dây thật chỉ tải lên qua app, nằm trong Google Sheet/Drive riêng của bạn.

## Các file

| File | Dùng để |
|---|---|
| `Code.gs-v1.0.0.txt` | Mã máy chủ, dán vào Apps Script của Google Sheet |
| `docs/` | Bộ PWA để đăng lên GitHub Pages: `index.html` (app thật), `demo.html` (bản xem thử), `sw.js`, `manifest.webmanifest`, `icons/` |
| `app-v1.0.0.html` | Giống `docs/index.html`, gói trong một file |
| `demo-v1.0.0.html` | Bản xem thử chạy hẳn trong trình duyệt, có máy chủ giả và dữ liệu mẫu |
| `src/` | Mã nguồn: `app.html`, `Code.gs`, `sw.js`, `config.json`, `demo/`, `icons/` |
| `tools/build.mjs` | Ghép `src/` thành các file trên: `node tools/build.mjs` |
| `tests/` | `npm test`: kiểm thử máy chủ. `npm run e2e`: bấm thử toàn bộ luồng trên bản xem thử |

> Chỉ sửa trong `src/`, rồi chạy `node tools/build.mjs`. Không sửa thẳng các file do lệnh này tạo ra.

## Xem thử ngay

Mở `docs/demo.html` (hoặc `demo-v1.0.0.html`) bằng trình duyệt và đăng nhập bằng PIN **111111**.

- Muốn thử khi mất mạng: **Cài đặt (bánh răng) → Giả lập mất mạng**.
- Bản xem thử chỉ dịch được vài câu mẫu, ví dụ "Thay lọc mực", "Kiểm tra áp suất meniscus", "Mass chung", "Nối đất".

## Cài đặt (lần đầu)

1. Tạo **Google Sheet mới** (để trống), rồi vào **Tiện ích mở rộng → Apps Script**.
2. Xoá mã có sẵn, dán toàn bộ `Code.gs-v1.0.0.txt`, rồi bấm **Lưu**.
3. Chọn hàm `caiDatBanDau` → **Chạy** → cấp quyền khi Google hỏi. Hàm này sẽ:
   - tạo các trang;
   - tạo 4 nhóm tài liệu;
   - tạo bộ thông số máy in mẫu;
   - đặt PIN **111111**.
4. Chọn hàm `thuDich` → **Chạy** để kiểm tra tự dịch. Kết quả đúng là hai câu đã được dịch.
5. Vào **Triển khai → Tùy chọn triển khai mới**, chọn loại **Ứng dụng web**:
   - "Thực thi với": **Tôi**;
   - "Người có quyền truy cập": **Bất kỳ ai**;
   - bấm **Triển khai**, rồi chép link kết thúc bằng `/exec`.

   Để "Bất kỳ ai" là để app gọi được máy chủ. Dữ liệu vẫn được bảo vệ, vì mọi lệnh đều phải có PIN.
6. Mở app lần đầu, dán link `/exec` vào, rồi đăng nhập bằng PIN 111111. App sẽ nhắc bạn đổi PIN: vào **Cài đặt → Đổi PIN**.
   - App không nhận PIN quá dễ đoán (111111, 222222, 123456, 654321…).
   - Nhập sai PIN nhiều lần thì bị khoá tạm vài phút.

**Nâng cấp sau này** (giữ nguyên link): dán mã mới vào Apps Script, bấm **Lưu**, rồi vào **Triển khai → Quản lý triển khai** → bút chì → **Phiên bản mới** → **Triển khai**. Đừng chọn "Tùy chọn triển khai mới", vì như vậy sẽ ra link khác.

## Đăng lên web để cài vào iPhone

1. Trên GitHub, vào **Settings → Pages**:
   - Source: *Deploy from a branch*;
   - chọn nhánh chứa code này;
   - Folder: `/docs`.
2. Khoảng 1 phút sau, app có ở `https://<tài-khoản>.github.io/<tên-repo>/`.
3. Trên iPhone: mở link bằng **Safari** → **Chia sẻ** → **Thêm vào Màn hình chính**.

Giới hạn của PWA trên iPhone:
- Việc chờ gửi chỉ được gửi khi app đang mở và có mạng.
- Đừng xoá icon khi vẫn còn việc chờ gửi.

## Cách dùng nhanh

| Màn | Làm gì |
|---|---|
| **Tìm · 搜索** | Một ô tìm chung cho ghi chú, tài liệu và số dây. Gõ không dấu cũng được ("loc muc"), gõ chữ Trung cũng được |
| **Ghi chú · 笔记** | Tiêu đề, nội dung, thẻ, mã máy và tối đa 6 ảnh chụp tại chỗ (ảnh tự thu nhỏ). Lọc theo thẻ. Lúc mất mạng vẫn ghi và sửa được |
| **Tài liệu · 资料** | Tải lên PDF, Word, Excel hoặc ảnh (tối đa 25 MB), hoặc dán link Google Drive cho tệp lớn hơn. Một tài liệu có nhiều phiên bản, và đúng một bản **Đang hiệu lực**. Bấm **Lưu xem khi mất mạng** để mở được cả khi không có sóng |
| **Tra dây · 查线号** | Tìm theo số dây, điểm đầu/cuối, tín hiệu hoặc tờ bản vẽ. Nút **Mở bản vẽ** mở thẳng PDF ở đúng trang |
| **Tính toán · 计算** | Nhập xung encoder, đường kính trục, số cạnh, divider, chiều dài sản phẩm và tốc độ để ra DPI, tần số phun, tốc độ tối đa, divider tối thiểu và delay PB1/PB2 × JA1–4. Lưu được nhiều bộ thông số |
| **Cài đặt** | Hàng chờ gửi, xuất Excel song ngữ, nhóm tài liệu, nhật ký sửa đổi, đổi PIN |

### Nhập bảng dây từ Excel

Bản vẽ điện là hình vẽ, không có chữ để máy tự đọc ra số dây, nên bảng dây phải nhập tay theo từng tờ:

1. Vào **Tra dây → Tải file mẫu**.
2. Điền mỗi dây một dòng: Số dây, Bản vẽ, Tờ, Từ điểm, Đến điểm, Màu, Tín hiệu, Trang PDF, Ghi chú. Cột tín hiệu tiếng Trung để trống thì app tự dịch.
3. Tải bản vẽ PDF lên ở mục **Tài liệu** (nhóm *Bản vẽ điện*).
4. Vào **Tra dây → Nhập từ Excel**, chọn PDF bản vẽ để gắn với các dòng, rồi chọn file Excel.

Kết quả nhập:
- dòng trùng **Số dây + Bản vẽ + Tờ** thì được cập nhật;
- dòng chưa có thì được thêm mới;
- dòng lỗi được báo theo số dòng.

### Công thức máy tính

- DPI = xung/vòng × số cạnh ÷ divider ÷ (π × đường kính ÷ 25,4)
- Tần số phun (Hz) = (chiều dài SP ÷ 25,4) × DPI × tốc độ ÷ 60
- Delay (chấm) = khoảng cách (mm) ÷ 25,4 × DPI, làm tròn **sau cùng**.

Bảng tính cũ của nhà cung cấp nhân tỉ lệ từ số đã làm tròn, nên bị lệch tới vài chấm. Cách tính ở đây không mắc lỗi đó.

Đầu in ổn định ở 0–8 kHz, nên vượt 8 kHz thì ô tần số chuyển màu cam, vượt 20 kHz thì chuyển đỏ. Ví dụ với bộ mẫu (2500 xung, trục 120 mm, 4 cạnh, divider 6, SP 190 mm):
- 900 miếng/phút ra 112,29 dpi và **12,6 kHz** (vượt vùng ổn định);
- tốc độ tối đa để còn ≤ 8 kHz là 571 miếng/phút;
- hoặc giữ 900 miếng/phút thì phải đặt divider ≥ 10.

## Điểm mới của v1.0.0

Bản đầu tiên:
- ghi chú có ảnh, chạy cả khi mất mạng;
- tài liệu có phiên bản, xem được khi mất mạng;
- một ô tìm chung, không cần gõ dấu;
- tự dịch sang tiếng Trung, không dịch đè lên bản đã sửa tay;
- bảng tra dây gắn với trang bản vẽ, nhập được từ Excel;
- máy tính DPI, tần số và delay;
- xuất Excel song ngữ.

Google Sheet có các trang sau, tự tạo khi chạy `caiDatBanDau` hoặc lần đầu mở app:

| Trang | Nội dung |
|---|---|
| `NguoiDung` | PIN (đã mã hoá) |
| `GhiChu` | Ghi chú, ảnh (mã tệp Drive), thẻ, bản dịch, cờ sửa tay |
| `NhomTL` | Nhóm tài liệu |
| `TaiLieu` | Mỗi phiên bản một dòng, `HienHanh = 1` là bản đang hiệu lực |
| `DayDien` | Bảng dây, gắn với tài liệu và trang |
| `CauHinhMay` | Các bộ thông số máy tính |
| `NhatKy` | Mọi lần sửa và xoá: lúc nào, trước khi sửa, sau khi sửa |

Quy ước dữ liệu:
- Không xoá dòng nào; mục bị xoá chỉ được đánh dấu `Xoa = 1`.
- Cột mới luôn thêm vào cuối.
- Chữ bắt đầu bằng `= + - @` được chèn dấu nháy để Sheet không hiểu nhầm là công thức.

## Kiểm thử

```
npm test        # 21 bài kiểm thử máy chủ (chạy Code.gs trong máy chủ giả)
npm run e2e     # build + Playwright bấm 20 bước trên docs/demo.html, không được có lỗi JavaScript
```
