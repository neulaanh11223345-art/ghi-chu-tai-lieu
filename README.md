# Ghi chú & Tra cứu tài liệu · 笔记与资料查询 (v1.2.0)

App riêng cho một người dùng: ghi chú ngay tại máy, tra cứu tài liệu (sổ tay, bản vẽ, quy trình), tra số dây điện theo bản vẽ, lưu thông số máy in theo từng chuyền và sản phẩm, tính DPI, tần số phun, delay, và tra bảng chương trình PLC của từng chuyền.

- **iPhone:** dùng dạng PWA. Mở bằng Safari rồi chọn "Thêm vào Màn hình chính". Mất mạng vẫn xem và ghi được.
- **Máy tính:** mở cùng địa chỉ bằng trình duyệt.
- **Dữ liệu:** lưu trong **Google Sheet**, đọc và ghi qua Google Apps Script. Tệp tài liệu và ảnh nằm trong Google Drive của chủ sheet, để **riêng tư**, không ai có link xem trực tiếp.
- **Ngôn ngữ:** song ngữ Việt · 中文. Bạn gõ tiếng Việt, app tự dịch sang tiếng Trung. Bản dịch nào bạn đã sửa tay thì app không dịch đè lên nữa.

> **Tài liệu mật:** sổ tay của nhà cung cấp ghi "Confidential Information", còn repo này để công khai. Vì vậy code và bản xem thử chỉ có dữ liệu mẫu `TEST-*`. Sổ tay thật, bản vẽ thật và bảng dây thật chỉ tải lên qua app, nằm trong Google Sheet/Drive riêng của bạn.

## Các file

| File | Dùng để |
|---|---|
| `Code.gs-v1.2.0.txt` | Mã máy chủ, dán vào Apps Script của Google Sheet |
| `docs/` | Bộ PWA để đăng lên GitHub Pages: `index.html` (app thật), `demo.html` (bản xem thử), `sw.js`, `manifest.webmanifest`, `icons/` |
| `app-v1.2.0.html` | Giống `docs/index.html`, gói trong một file |
| `demo-v1.2.0.html` | Bản xem thử chạy hẳn trong trình duyệt, có máy chủ giả và dữ liệu mẫu |
| `src/` | Mã nguồn: `app.html`, `Code.gs`, `sw.js`, `config.json`, `demo/`, `icons/` |
| `tools/build.mjs` | Ghép `src/` thành các file trên: `node tools/build.mjs` |
| `tests/` | `npm test`: kiểm thử máy chủ. `npm run e2e`: bấm thử toàn bộ luồng trên bản xem thử |
| `*-v1.0.0.*`, `*-v1.1.0.*` | Bản cũ, giữ lại để đối chiếu hoặc quay lại khi cần |

> Chỉ sửa trong `src/`, rồi chạy `node tools/build.mjs`. Không sửa thẳng các file do lệnh này tạo ra.

## Xem thử ngay

Mở `docs/demo.html` (hoặc `demo-v1.2.0.html`) bằng trình duyệt và đăng nhập bằng PIN **111111**.

- Muốn thử khi mất mạng: **Cài đặt (bánh răng) → Giả lập mất mạng**.
- Bản xem thử chỉ dịch được vài câu mẫu, ví dụ "Thay lọc mực", "Kiểm tra áp suất meniscus", "Mass chung", "Nối đất".

## Cài đặt (lần đầu)

1. Tạo **Google Sheet mới** (để trống), rồi vào **Tiện ích mở rộng → Apps Script**.
2. Xoá mã có sẵn, dán toàn bộ `Code.gs-v1.2.0.txt`, rồi bấm **Lưu**.
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
| **Máy in · 喷码机** | Gom ba màn của máy in phun, chọn ở thanh trên: **Thông số**, **Tính toán**, **Tra dây** |
| **Chương trình · PLC程序** | Tra bảng chương trình PLC của từng chuyền: địa chỉ IO, báo lỗi, chú thích M/D/B/W… (xem Điểm mới của v1.2.0) |
| ↳ **Thông số** | Thông số máy in theo chuyền → sản phẩm, chia đúng các màn hình bộ điều khiển Merlin D CE. Mỗi lần đổi là một lần ghi mới có ngày và lý do. Xem chi tiết ở phần Điểm mới của v1.1.0 |
| ↳ **Tra dây** | Tìm theo số dây, điểm đầu/cuối, tín hiệu hoặc tờ bản vẽ. Nút **Mở bản vẽ** mở thẳng PDF ở đúng trang |
| ↳ **Tính toán** | Nhập xung encoder, đường kính trục, số cạnh, divider, chiều dài sản phẩm và tốc độ để ra DPI, tần số phun, tốc độ tối đa, divider tối thiểu và delay PB1/PB2 × JA1–4. Lưu được nhiều bộ thông số |
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

## Điểm mới của v1.2.0: tab Chương trình (bảng PLC theo chuyền), gom các màn máy in

**Tab mới thay đổi bố cục**

Thanh tab dưới cùng giờ là: Tìm · Ghi chú · Tài liệu · **Máy in** · **Chương trình**.
- **Máy in** gom ba màn trước đây nằm riêng: **Thông số**, **Tính toán**, **Tra dây**. Chọn màn ở thanh trên cùng; app nhớ màn mở lần trước.
- **Chương trình** là phần mới, mô tả bên dưới.

**Tab Chương trình: tra bảng PLC của từng chuyền**

Mỗi chuyền có một file Excel chương trình (ví dụ máy VKY06): địa chỉ IO, slot module, báo lỗi, chú thích M/D/B/W/L/R/T, động cơ, servo… File của máy 06 có 21 sheet, gần 30.000 dòng.

- **Tải bảng:** bấm **Tải bảng**, chọn chuyền và file `.xlsx`.
  - App đọc thử file trên máy trước; file hỏng thì báo ngay, không tải lên.
  - Tệp lưu ở Drive riêng, trong mục Tài liệu, nhóm **Chương trình PLC** (tự tạo nếu chưa có).
  - Tải lại cho chuyền đã có bảng thì thành phiên bản mới; bản cũ vẫn xem lại được ở mục Tài liệu.
- **Tra cứu:**
  - Gõ địa chỉ (`X1002`, `M600`, `D120`) hoặc chữ (`急停`, `HG-SR352`).
  - Ô khớp đúng cả ô được xếp trước. Mỗi kết quả ghi máy nào, sheet nào, ô nào (ví dụ `远程IO · B4`), kèm các ô bên cạnh nên thấy luôn cặp địa chỉ ↔ chú thích.
  - Cùng một địa chỉ ở nhiều máy thì ra đủ các máy.
  - Lọc được theo chuyền và theo sheet.
- **Dịch:** nút **Dịch · 翻译** dịch dòng đó sang tiếng Việt. Chỉ dịch khi bấm, vì dịch sẵn hàng chục nghìn dòng sẽ vượt hạn mức Google Dịch mỗi ngày.
- **Mở bảng:** mở cả sheet tại đúng dòng, tô ô tìm được, lật trang 60 dòng, đổi sheet được.
- **Tìm chung:** ô tìm ở tab Tìm cũng ra 5 kết quả đầu của bảng chương trình.
- **Mất mạng:** bảng đã đọc được lưu trong máy, nên mất mạng vẫn tra được. Riêng nút Dịch cần có mạng.
- **Thử với file thật:** file máy 06 (1,9 MB, 21 sheet) đọc xong trong khoảng 4 giây trên máy tính.

**Nâng cấp từ v1.1.0:**
1. Dán `Code.gs-v1.2.0.txt` đè lên mã cũ, bấm Lưu.
2. **Triển khai → Quản lý triển khai → Phiên bản mới**.

Trang mới `BangMay` (chuyền ↔ tài liệu bảng chương trình) được tự tạo. Lần tải bảng đầu tiên sẽ tạo thêm nhóm tài liệu "Chương trình PLC". Không trang cũ nào thêm cột.

> File chương trình là tài liệu nội bộ của máy: chỉ tải lên qua app, nằm trong Drive riêng. Repo công khai chỉ có bảng mẫu `TEST-*`.

## Điểm mới của v1.1.0: thông số máy theo chuyền và sản phẩm

Tab mới **Thông số · 参数**. Mỗi sản phẩm có thông số riêng, và mỗi chuyền chạy những sản phẩm khác nhau. Vì vậy thông số được lưu theo **cặp chuyền + sản phẩm**: cùng một sản phẩm chạy ở hai chuyền thì có hai bộ thông số.

**Chuyền:** 9 chuyền được tạo sẵn ở lần mở app đầu tiên sau khi nâng cấp.

| Loại | Chuyền | Đầu in |
|---|---|---|
| 1 màu | 01, 09, 21, 16 | chỉ PB1 = JA1–4 |
| 2 màu | 23, 06, 08, 27, 18 | một đầu in hai màu: PB1 = JA1–4 mực xanh, PB2 = JA5–8 mực tím |

Thêm chuyền, đổi số màu hay đổi tên mực của PB ở **Cài đặt → Chuyền sản xuất** hoặc nút **Sửa** trong màn chuyền.

**Màn danh sách:**
- mỗi chuyền ghi đang chạy sản phẩm nào, kèm divider, DPI, tốc độ và tần số phun;
- tần số vượt 8 kHz thì chip chuyển cam;
- lọc được theo 1 màu / 2 màu, hoặc chuyển sang xem theo **Sản phẩm**.

**Màn một chuyền:**
- sản phẩm đang chạy (viền xanh) và các sản phẩm khác của chuyền;
- **Chuyển sang SP này**: ghi ngày bắt đầu chạy, có lịch sử chạy;
- **Thêm sản phẩm vào chuyền**, **Gỡ** sản phẩm (sản phẩm đang chạy thì không gỡ được);
- thông tin đầu in trên chuyền: số seri, ngày thay đầu in, ngày thay lọc mực. Sửa các ô này thì bản cũ vẫn giữ trong Nhật ký.

**Màn thông số:** chia đúng các màn hình của bộ điều khiển, tên tiếng Anh giữ như trên máy, kèm số mục trong sổ tay Merlin D CE.

| Khối | Gồm |
|---|---|
| Encoders | Direction, Decode, Encoder DPI, Divider |
| Print Control | Trigger Mode, Fire Mode |
| Form Specification | Length (= chiều dài sản phẩm, tự đổi ra inch), Delay |
| Head Alignments | JA1–4, thêm JA5–8 với máy 2 màu, kèm Image Registration |
| Fire Pulses | điện áp theo từng JA |
| Pneumatics | Meniscus, Lung Vacuum, Short/Long Purge |
| Heads | nhiệt tấm phun; nhiệt bình mực, LOIS và loại mực cho từng PB |
| Sản xuất | tốc độ chạy |

**Cập nhật thông số:**
- Form điền sẵn số hiện tại; ô nào sửa thì tô cam.
- Trước khi lưu, app liệt kê thay đổi, ví dụ "Fire Pulses JA5: 102 → 104".
- Lý do thay đổi tự dịch sang tiếng Trung.
- Lưu là thêm một lần ghi mới, không sửa lần cũ. Lịch sử hiện mỗi lần đổi những gì. Ghi nhầm thì bấm **Xoá lần ghi nhầm**; lần ghi đó chỉ bị đánh dấu xoá, vẫn còn trên Sheet.
- **Chép từ** sản phẩm khác cùng chuyền, hoặc từ cùng sản phẩm ở chuyền khác. Chép từ máy 2 màu sang máy 1 màu thì chỉ lấy phần PB1.
- **Tính theo Divider** tự điền Head Alignments từ khoảng cách JA/PB (dùng bộ thông số đầu tiên ở màn Tính toán).

**Thêm:**
- **So sánh các chuyền**: mỗi chuyền một cột, so thông số của sản phẩm đang chạy.
- Ô tìm kiếm tìm được theo mã/tên sản phẩm, số chuyền và số seri đầu in.
- Xuất Excel thêm 3 sheet: *Thông số hiện tại*, *Lịch sử thông số* (mỗi JA một cột), *Sản phẩm*.

**Nâng cấp từ v1.0.0:**
1. Dán `Code.gs-v1.2.0.txt` đè lên mã cũ, bấm Lưu.
2. **Triển khai → Quản lý triển khai → Phiên bản mới**.

Lần đầu mở app, máy chủ tự tạo 5 trang mới và 9 chuyền. Không trang cũ nào thêm hay đổi cột.

| Trang mới | Nội dung |
|---|---|
| `Chuyen` | Chuyền: số màu, tên mực PB1/PB2, seri đầu in, ngày thay đầu in / lọc |
| `SanPham` | Mã, tên, tên tiếng Trung, chiều dài (mm) |
| `ChuyenSP` | Chuyền nào có sản phẩm nào |
| `ChaySP` | Lịch sử chạy: chuyền chạy sản phẩm nào từ ngày nào |
| `ThongSo` | Mỗi lần ghi thông số một dòng. Align/Volt là 4 hoặc 8 số cách nhau bởi "/" |

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
npm test        # 32 bài kiểm thử máy chủ (chạy Code.gs trong máy chủ giả)
npm run e2e     # build + Playwright bấm 29 bước trên docs/demo.html, không được có lỗi JavaScript
```
