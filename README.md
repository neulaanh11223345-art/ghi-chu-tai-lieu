# Ghi chú & Tra cứu tài liệu · 笔记与资料查询 (v1.6.0)

App riêng cho một người dùng: ghi chú ngay tại máy, tra cứu tài liệu (sổ tay, bản vẽ, quy trình), tra số dây điện theo bản vẽ, lưu thông số máy in theo từng chuyền và sản phẩm, tính DPI, tần số phun, delay, và tra bảng chương trình PLC của từng chuyền.

- **iPhone:** dùng dạng PWA. Mở bằng Safari rồi chọn "Thêm vào Màn hình chính". Mất mạng vẫn xem và ghi được.
- **Máy tính:** mở cùng địa chỉ bằng trình duyệt.
- **Dữ liệu:** lưu trong **Google Sheet**, đọc và ghi qua Google Apps Script. Tệp tài liệu và ảnh nằm trong Google Drive của chủ sheet, để **riêng tư**, không ai có link xem trực tiếp.
- **Ngôn ngữ:** song ngữ Việt · 中文. Bạn gõ tiếng Việt, app tự dịch sang tiếng Trung. Bản dịch nào bạn đã sửa tay thì app không dịch đè lên nữa.

> **Tài liệu mật:** sổ tay của nhà cung cấp ghi "Confidential Information", còn repo này để công khai. Vì vậy code và bản xem thử chỉ có dữ liệu mẫu `TEST-*`. Sổ tay thật, bản vẽ thật và bảng dây thật chỉ tải lên qua app, nằm trong Google Sheet/Drive riêng của bạn.

## Các file

| File | Dùng để |
|---|---|
| `Code.gs-v1.5.0.txt` | Mã máy chủ, dán vào Apps Script của Google Sheet |
| `docs/` | Bộ PWA để đăng lên GitHub Pages: `index.html` (app thật), `demo.html` (bản xem thử), `sw.js`, `manifest.webmanifest`, `icons/` |
| `app-v1.5.0.html` | Giống `docs/index.html`, gói trong một file |
| `demo-v1.5.0.html` | Bản xem thử chạy hẳn trong trình duyệt, có máy chủ giả và dữ liệu mẫu |
| `src/` | Mã nguồn: `app.html`, `Code.gs`, `sw.js`, `config.json`, `demo/`, `icons/` |
| `tools/build.mjs` | Ghép `src/` thành các file trên: `node tools/build.mjs` |
| `tests/` | `npm test`: kiểm thử máy chủ. `npm run e2e`: bấm thử toàn bộ luồng trên bản xem thử |
| `*-v1.0.0.*`, `*-v1.1.0.*`, `*-v1.2.0.*`, `*-v1.3.0.*`, `*-v1.4.0.*` | Bản cũ, giữ lại để đối chiếu hoặc quay lại khi cần |

> Chỉ sửa trong `src/`, rồi chạy `node tools/build.mjs`. Không sửa thẳng các file do lệnh này tạo ra.

## Xem thử ngay

Mở `docs/demo.html` (hoặc `demo-v1.5.0.html`) bằng trình duyệt và đăng nhập bằng PIN **111111**.

- Muốn thử khi mất mạng: **Cài đặt (bánh răng) → Giả lập mất mạng**.
- Bản xem thử chỉ dịch được vài câu mẫu, ví dụ "Thay lọc mực", "Kiểm tra áp suất meniscus", "Mass chung", "Nối đất".

## Cài đặt (lần đầu)

1. Tạo **Google Sheet mới** (để trống), rồi vào **Tiện ích mở rộng → Apps Script**.
2. Xoá mã có sẵn, dán toàn bộ `Code.gs-v1.5.0.txt`, rồi bấm **Lưu**.
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

Thanh dưới có 5 nút: **Trang chủ · Ghi chú · Tìm (nút tròn ở giữa) · Máy in · Thêm**. Tài liệu, Chương trình và Cài đặt nằm trong **Thêm** (và có ô riêng ở Trang chủ). Bấm hình tròn chữ cái ở góc phải trên cũng mở **Thêm**.

| Màn | Làm gì |
|---|---|
| **Trang chủ · 首页** | Lời chào, ngày, 6 ô tổng quan (bấm vào mở thẳng phần đó), nút **Cập nhật**, ghi chú gần đây |
| **Tìm · 搜索** | Một ô tìm chung cho ghi chú, tài liệu, số dây và mạch điện. Gõ không dấu cũng được ("loc muc"), gõ chữ Trung cũng được |
| **Ghi chú · 笔记** | Tiêu đề, nội dung, thẻ, mã máy và tối đa 6 ảnh chụp tại chỗ (ảnh tự thu nhỏ). Lọc theo thẻ. Lúc mất mạng vẫn ghi và sửa được |
| **Tài liệu · 资料** | Tải lên PDF, Word, Excel hoặc ảnh (tối đa 25 MB), hoặc dán link Google Drive cho tệp lớn hơn. Một tài liệu có nhiều phiên bản, và đúng một bản **Đang hiệu lực**. Bấm **Lưu xem khi mất mạng** để mở được cả khi không có sóng |
| **Máy in · 喷码机** | Gom ba màn của máy in phun, chọn ở thanh trên: **Thông số**, **Tính toán**, **Tra dây** |
| **Chương trình · PLC程序** | Chọn chuyền sản xuất (16 chuyền, danh sách riêng với máy in), gõ đúng địa chỉ như `M570` là ra ngay địa chỉ đó ứng với gì, kèm ghi chú của bạn và lịch sử sửa (xem Điểm mới của v1.4.0) |
| ↳ **Thông số** | Thông số máy in theo chuyền → sản phẩm, chia đúng các màn hình bộ điều khiển Merlin D CE. Mỗi lần đổi là một lần ghi mới có ngày và lý do. Xem chi tiết ở phần Điểm mới của v1.1.0 |
| ↳ **Tra dây** | Tra theo **mạch**: gõ hàng kẹp, cầu chì, mã cáp hoặc điện áp là ra cả đường đi và dây về; gõ số dòng là ra tờ nào. Vẫn tìm theo số dây, điểm đầu/cuối, tín hiệu như cũ. Nút **Mở bản vẽ** mở thẳng PDF ở đúng trang (xem Điểm mới của v1.6.0) |
| ↳ **Tính toán** | Bảng tính Encoder / Delay / Alignment của nhà cung cấp, đúng từng công thức. Nhập các ô xanh, ra delay JA1–8 để nhập máy, so với JA đang đặt trên máy; lưu theo từng đầu in, có lịch sử |
| **Thêm · 更多** | Tài liệu, Chương trình, phiên bản app + nút Cập nhật, hàng chờ gửi, xuất Excel song ngữ, nhóm tài liệu, nhật ký sửa đổi, đổi PIN |

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

### Công thức máy tính (theo bảng tính Encoder delay alignment của nhà cung cấp)

Ký hiệu trong ngoặc là ô tương ứng trong file Excel.

- **DPI (M4)** = xung/vòng × Edges ÷ Divider ÷ (Roller mm ÷ 25,4 × 3,141516)
- **PB1, chưa căn chỉnh (N5:N8):** JA1 = 0; JAk = ROUND(27,4333 × (k−1) ÷ (25,4 ÷ DPI))
- **PB1, có căn chỉnh (Q21:Q24):**
  - JA4 = N8 + khe hở PB1 ÷ 25,4 × DPI
  - JA2 = ROUND(JA4 ÷ 3)
  - JA3 = ROUND(JA4 × 2 ÷ 3)
- **PB2 (W21:W24):**
  - JA5 = ROUND(JA4 + 33,528 ÷ 25,4 × DPI) + lệch PB2 ÷ 25,4 × DPI
  - JA6–8 = JA5 + JA2 / JA3 / JA4
- **Tần số (N28)** = dài SP ÷ 25,4 × PPm ÷ 60 × DPI. Đầu in ổn định ở 0–8 kHz.
- **DPI mới (T, W):** ROUND(DPI mới ÷ DPI × số đang có).

App làm đúng như file để số trùng với Excel. Lưu ý hai điểm của file:
- Số PB2 có thể lẻ vì độ lệch PB2 không được làm tròn. App hiện cả số lẻ ("Tính ra") và số đã làm tròn ("Nhập máy").
- Số ở DPI mới được nhân tỉ lệ từ số đã làm tròn, nên có thể lệch 1 chấm so với tính thẳng từ khoảng cách.

## Điểm mới của v1.6.0: bố cục như app bảo dưỡng, nút Cập nhật, tra dây theo mạch

**Bố cục mới**
- Thanh trên màu trắng: biểu tượng app, tên màn (Việt · 中文), trạng thái **Đã đồng bộ / n chờ gửi / Mất mạng**, hình tròn chữ cái đầu tên.
- **Trang chủ** có thẻ lời chào (tên, ngày, thứ) và 6 ô tổng quan màu, bấm vào là mở thẳng:

| Ô | Hiện gì |
|---|---|
| Ghi chú | tổng số, số ghi chú sửa trong 7 ngày |
| Tài liệu | số tài liệu đang hiệu lực, số tài liệu lưu xem offline |
| Thông số máy in | số chuyền đã ghi thông số / tổng số chuyền |
| Tính toán | số đầu in đã lưu bảng tính; báo đỏ nếu JA thực tế lệch số tính ra |
| Tra dây | số mạch, số đoạn dây; báo đỏ số chỗ **cần kiểm tra** |
| Chương trình | số chuyền có bảng PLC / tổng chuyền PLC, số ghi chú địa chỉ |

- Thanh dưới: Trang chủ · Ghi chú · **Tìm** (nút tròn ở giữa) · Máy in · Thêm. Còn việc chờ gửi thì nút Trang chủ hiện số.

**Nút Cập nhật** (ở Trang chủ, cạnh "Tổng quan", và ở **Thêm → Ứng dụng**). Bấm sau khi sửa trên Google Sheet, dán lại Code.gs hoặc khi có bản app mới. App sẽ:
1. gửi các việc còn chờ;
2. tải lại toàn bộ dữ liệu từ Google Sheet;
3. hỏi GitHub Pages xem có bản app mới không; có thì tải lại trang ngay.

Dòng "Cập nhật lúc …" cho biết lần tải dữ liệu gần nhất. Nếu máy chủ còn chạy bản Code.gs cũ, Trang chủ hiện dòng đỏ nhắc dán lại Code.gs. Mất mạng thì báo lỗi, việc chờ giữ nguyên.

**Tra dây theo mạch**

Bản vẽ điện của máy in không đánh số dây. Dây được gọi theo **màu + mã cáp** (ví dụ "RED OF <mã cáp>" là sợi đỏ trong cáp đó), sợi "…'S BLACK" là sợi đen đi cặp, tức dây về. Số trong hình lục giác là **số dòng** ở tờ khác nơi dây đi tiếp. Vì vậy app thêm hai bảng:

- **Mạch** (trang `MachDien`): mỗi mạch một dòng, đi trọn **bộ nguồn → cầu chì → hàng kẹp (+) → thiết bị**, rồi **chân về → hàng kẹp (−) → cực chung**.
- **Số dòng → tờ** (trang `DongTo`): mỗi tờ một dải dòng, ví dụ tờ 8 = dòng 260–279.

Ở **Máy in → Tra dây**:
- Gõ hàng kẹp (`TB23`), cầu chì (`FB2`), mã cáp hoặc điện áp (`48V`) → ra cả mạch vẽ dọc. Dây đi màu theo điện áp, dây về màu đen, điểm khớp tô vàng.
- Gõ số dòng (`261`) → "Dòng 261 nằm ở tờ 8", các mạch đi qua dòng đó, nút **Mở bản vẽ tờ 8**.
- Chưa gõ gì → **Bảng nguồn**: mọi mạch với điện áp, cầu chì, hàng kẹp. Bấm một dòng để xem cả mạch.
- Nút lọc theo điện áp: 150 V, 48 V, 24 V, 15 V, 12 V, AC, PE.
- Mỗi mạch có nút **Ghi chú / điện áp đo**: mở ghi chú mới điền sẵn tên mạch (mã máy = tên mạch, thẻ `điện`). Ghi chú đó hiện ngay dưới mạch.
- Chỗ bản vẽ ghi lẫn (cột **Cần kiểm tra**) được tô cam để đối chiếu tủ thật.
- **+ Mạch** để thêm hoặc sửa mạch bằng tay.

Bảng dây có thêm 7 cột: Dòng, Mạch, Cặp với, Cáp / mã dây, Điện áp, Bảo vệ, Cần kiểm tra.

**Nhập Excel:** một file có thể có 3 trang, app tự nhận theo tiêu đề cột:

| Trang | Nhận ra nhờ cột | Trùng thì cập nhật theo |
|---|---|---|
| Dây điện | Số dây | Số dây + Bản vẽ + Tờ |
| Mạch | Mạch + (Bộ nguồn / Hàng kẹp (+) / Đến) | Bản vẽ + Mạch |
| Dòng → Tờ | Tờ + Dòng (ghi `260–279`) hoặc Từ dòng / Đến dòng | Bản vẽ + Tờ |

Trang khác (ví dụ "Cách đọc") được bỏ qua và báo tên. Dòng lỗi báo theo trang và số dòng. **Tải file mẫu** giờ có đủ 3 trang. **Xuất Excel song ngữ** có thêm trang Mạch và Dòng → Tờ.

**Nâng cấp từ v1.5.0:**
1. Dán `Code.gs-v1.6.0.txt` đè lên mã cũ, bấm Lưu.
2. **Triển khai → Quản lý triển khai → Phiên bản mới**.
3. Mở app, bấm **Cập nhật**.

Trang `DayDien` được thêm 7 cột ở **cuối**: `Dong`, `Mach`, `Cap`, `CapVoi`, `DienAp`, `BaoVe`, `CanKiemTra`. Dây cũ giữ nguyên. Hai trang mới `MachDien` và `DongTo` được tự tạo. Không phải nhập lại gì.

## Điểm mới của v1.5.0: màn Tính toán làm theo bảng tính Encoder / Delay / Alignment

Màn **Máy in → Tính toán** làm lại **theo đúng file "Encoder delay alignment" của nhà cung cấp**. App dùng đúng từng công thức của file, kể cả số π = 3,141516 và cách làm tròn, nên số trên app trùng số trong Excel.

**Chọn đầu in**

Bấm số chuyền máy in ở hàng trên cùng. App điền sẵn:
- lần lưu mới nhất của đầu in đó;
- nếu chưa lưu lần nào: chiều dài sản phẩm đang chạy, divider và tốc độ lấy từ Thông số hiện tại.

**Ô xanh (được chỉnh), giống file**

| Ô | Trong file |
|---|---|
| Encoder resolution | B1 |
| Roller Encoder mm | D1 |
| Edges | F1 |
| Divider | H1 |
| PB1 Alignment Gap/Overlap mm | P16 |
| PB2 offset mm | V16 |
| PAD size mm | N26 |
| PPm | N27 |
| New DPI | S4 |
| Programmable encoder DPI | P14 |

**Kết quả, giống file**
- DPI (M4), tần số (N28; cảnh báo khi vượt 8 kHz), m/phút, m/giờ, feet/phút.
- **Bảng delay JA1–8** gồm các cột:
  - *Chưa căn*: N5:N8, Q5:Q8.
  - *Tính ra*: Q21:Q24 cho PB1, W21:W24 cho PB2. Số PB2 của file có thể lẻ (ví dụ 63,97) vì độ lệch PB2 không được làm tròn.
  - *Nhập máy*: số đã làm tròn để gõ vào màn Head Alignments.
- DPI mới (T5:T8, W5:W8, tần số V10).
- Số xung encoder lập trình (Q14).
- Bảng tra DPI theo Divider 1–100 cho Edges 4 / 2 / 1, tô dòng đang dùng.

Máy 1 màu chỉ có JA1–4. Máy 2 màu có JA1–4 (PB1) và JA5–8 (PB2).

**So với máy thật**
- Nhập JA1–8 đang đặt trên máy. Nếu chưa nhập thì app lấy từ Head Alignments trong Thông số hiện tại.
- Cột **Lệch** ghi số chấm và số mm lệch trên sản phẩm: xanh là khớp, cam là lệch 1 chấm, đỏ là lệch từ 2 chấm.

**Lưu cho đầu in này**
- Mỗi lần lưu là một lần ghi mới (ô xanh, JA thực tế, JA tính ra, ghi chú tự dịch).
- Lịch sử ghi rõ lần nào JA nào lệch.
- **Đưa vào ô nhập** để dùng lại một lần lưu cũ. **Xoá lần ghi nhầm** chỉ đánh dấu xoá.

Nút **Tính theo Divider** trong form Thông số giờ cũng dùng công thức này, với encoder / trục / khe hở đã lưu cho đầu in đó.

**Nâng cấp từ v1.4.0:**
1. Dán `Code.gs-v1.5.0.txt` đè lên mã cũ, bấm Lưu.
2. **Triển khai → Quản lý triển khai → Phiên bản mới**.

Trang mới `TinhDauIn` được tự tạo. Trang `CauHinhMay` cũ giữ nguyên, không xoá, nhưng app không dùng nữa. Không trang cũ nào thêm cột.

## Điểm mới của v1.4.0: tra đúng tên, ghi chú theo địa chỉ có lịch sử

**Tra đúng tên**

Gõ `M570` thì chỉ ra các ô đúng là `M570`, không ra `M5701`, `M57`, hay ô có chữ M570 lẫn bên trong.
- Không phân biệt chữ hoa, chữ thường: `m570` cũng được.
- Dấu cách bị bỏ qua.

Ô Tìm chung ở tab Tìm cũng tra bảng chương trình theo cách này.

**Ghi chú theo địa chỉ**

Dùng khi bạn thêm địa chỉ mới vào chương trình, hoặc sửa một địa chỉ cũ.

- Tra một địa chỉ, ví dụ `M570`. Trên đầu kết quả là ô **Ghi chú của bạn** cho địa chỉ đó trên chuyền đang chọn.
  - Chưa có ghi chú thì bấm **Thêm ghi chú**.
  - Đã có thì hiện ghi chú mới nhất, kèm ngày giờ và bản dịch tiếng Trung tự động.
- Bấm **Sửa / ghi thêm**: ô nội dung điền sẵn ghi chú mới nhất.
  - Lưu là thêm một lần ghi mới, **lần cũ vẫn giữ trong Lịch sử**.
  - Ghi nhầm thì **Xoá lần ghi nhầm**; lần trước đó tự thành ghi chú hiện tại.
- Ghi chú gắn theo **chuyền + địa chỉ**. M570 của chuyền 06 và M570 của chuyền 23 là hai ghi chú riêng.
- Địa chỉ **chưa có trong bảng** (vừa thêm vào chương trình) vẫn ghi chú được. Chuyền chưa tải bảng cũng ghi chú được.
- Ở ô Tìm chung, kết quả bảng chương trình có hiện kèm ghi chú mới nhất của địa chỉ đó.
- Mất mạng vẫn ghi được; app tự gửi khi có mạng.

**Nâng cấp từ v1.3.0:**
1. Dán `Code.gs-v1.5.0.txt` đè lên mã cũ, bấm Lưu.
2. **Triển khai → Quản lý triển khai → Phiên bản mới**.

Trang mới `GhiChuPLC` được tự tạo. Không trang cũ nào thêm cột.

## Điểm mới của v1.3.0: chuyền PLC tách riêng, tra theo từng chuyền

**Danh sách chuyền riêng cho phần Chương trình**

Có 16 chuyền, theo đúng thứ tự: 01, 02, 03, 04, 09, 10, 15, 21, 23, 06, 08, 12, 17, 18, 16, 13.
- Danh sách này **tách riêng** với 9 chuyền của máy in: sửa bên này không ảnh hưởng bên kia.
- Thêm chuyền hoặc bỏ chuyền ở nút **Sửa danh sách**. Chuyền còn bảng chương trình thì phải gỡ bảng trước rồi mới bỏ được.

**Tra theo chuyền**
1. Bấm số chuyền ở hàng nút trên cùng. Chuyền chưa có bảng hiện viền đứt, kèm nút tải bảng cho chuyền đó. App nhớ chuyền mở lần trước.
2. Gõ địa chỉ vào ô tìm, ví dụ `X1002`. Kết quả đầu tiên ghi thẳng câu trả lời: **X1002 → 粉碎机异常**, kèm sheet / ô và các ô bên cạnh. Bấm **Dịch** để xem tiếng Việt.
3. Chỉ tìm trong bảng của chuyền đang chọn. Đã **bỏ ô chọn "Mọi sheet"**.

Ô Tìm chung ở tab Tìm vẫn tìm qua mọi chuyền, mỗi kết quả có ghi số chuyền.

**Nâng cấp từ v1.2.0:** dán `Code.gs-v1.5.0.txt` → Lưu → **Triển khai → Quản lý triển khai → Phiên bản mới**.
- Trang mới `ChuyenPLC` được tự tạo với 16 chuyền.
- Bảng đã tải ở v1.2.0 (đang gắn với chuyền máy in, ví dụ chuyền 06) được **tự chuyển sang chuyền PLC cùng mã**, không phải tải lại. Việc chuyển có ghi vào Nhật ký.
- Không trang cũ nào thêm cột.

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
1. Dán `Code.gs-v1.5.0.txt` đè lên mã cũ, bấm Lưu.
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
1. Dán `Code.gs-v1.5.0.txt` đè lên mã cũ, bấm Lưu.
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
npm test        # 43 bài kiểm thử máy chủ (chạy Code.gs trong máy chủ giả)
npm run e2e     # build + Playwright bấm 34 bước trên docs/demo.html, không được có lỗi JavaScript
```
