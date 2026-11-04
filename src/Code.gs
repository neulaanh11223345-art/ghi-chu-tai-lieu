/**
 * GHI CHÚ & TRA CỨU TÀI LIỆU · 笔记与资料查询 — máy chủ (Google Apps Script)
 * Dữ liệu lưu trong chính Google Sheet chứa script này (mỗi bảng một trang). Tệp tải lên và ảnh ghi chú
 * lưu trong Google Drive của chủ sheet, để RIÊNG TƯ: app đọc tệp qua máy chủ, không cấp link công khai,
 * vì sổ tay thiết bị là tài liệu mật của nhà cung cấp.
 *
 * Cài đặt lần đầu:
 *   1. Tạo Google Sheet mới → Tiện ích mở rộng → Apps Script → dán toàn bộ file này → Lưu.
 *   2. Chọn hàm caiDatBanDau → Chạy → cấp quyền. PIN mặc định 111111 — đổi ngay trong app (Cài đặt → Đổi PIN).
 *   3. Triển khai → Tùy chọn triển khai mới → Ứng dụng web; Thực thi với: Tôi; Truy cập: Bất kỳ ai.
 *   4. Chép link …/exec dán vào app.
 * Nâng cấp: dán đè file này → Lưu → Triển khai → Quản lý triển khai → bút chì → Phiên bản mới → Triển khai.
 * Các trang tự thêm cột mới ở cuối khi app tải dữ liệu.
 *
 * App chỉ có MỘT người dùng (chủ app), nên không chia vai trò. Mọi thao tác trừ ping/đăng nhập vẫn phải có
 * token hợp lệ: link /exec là công khai, không kiểm token thì ai biết link cũng đọc được tài liệu.
 */
var PHIEN_BAN = '1.2.0';
var TZ = 'Asia/Ho_Chi_Minh';
var HAN_PHIEN_NGAY = 30;            // đăng nhập giữ 30 ngày
var TEP_TOI_DA = 25 * 1024 * 1024;  // 25 MB/tệp: Apps Script nhận tối đa ~50 MB mỗi lần gửi, base64 làm to thêm 1/3
var ANH_TOI_DA = 6;                 // số ảnh tối đa trong một ghi chú
var THE_TOI_DA = 12;

// Cột mới luôn thêm vào CUỐI mỗi trang để sheet cũ vẫn đọc đúng (trang() tự ghi lại dòng tiêu đề).
var BANG = {
  NguoiDung: ['ID', 'Ten', 'PinHash', 'HoatDong', 'NgayTao'],
  // The, Anh: JSON. DichTay: JSON {tieuDe:1, noiDung:1} — trường nào đã sửa bản dịch bằng tay thì không dịch đè
  GhiChu: ['ID', 'TieuDe', 'TieuDeDich', 'NoiDung', 'NoiDungDich', 'The', 'Anh', 'MaMay', 'LucTao', 'CapNhat', 'OpId', 'Xoa', 'DichTay'],
  NhomTL: ['ID', 'Ten', 'TenZh', 'ThuTu', 'HoatDong', 'CapNhat', 'OpId'],
  // MaTL: các phiên bản của cùng một tài liệu dùng chung MaTL; chỉ một bản HienHanh = 1
  TaiLieu: ['ID', 'MaTL', 'Ten', 'TenDich', 'Nhom', 'Kieu', 'FileId', 'Mime', 'KichThuoc', 'Url', 'PhienBan', 'HienHanh',
    'The', 'TenTep', 'LucTao', 'CapNhat', 'OpId', 'Xoa', 'DichTay'],
  // Bảng tra dây: nhập tay theo bản vẽ (bản vẽ là nét vẽ, máy không đọc được chữ). TaiLieuID + Trang mở đúng tờ bản vẽ
  DayDien: ['ID', 'SoDay', 'BanVe', 'To', 'TuDiem', 'DenDiem', 'Mau', 'TinHieu', 'TinHieuZh', 'TaiLieuID', 'Trang', 'GhiChu',
    'CapNhat', 'OpId', 'Xoa', 'DichTay'],
  // Bộ thông số cho màn Tính toán (DPI, tần số phun, delay)
  CauHinhMay: ['ID', 'Ten', 'EncoderPPR', 'DuongKinh', 'SoCanh', 'Divider', 'DaiSP', 'TocDo', 'KhoangJA', 'KhoangPB', 'BuPB',
    'GioiHan', 'CapNhat', 'OpId', 'Xoa'],
  NhatKy: ['ID', 'ThoiGian', 'HanhDong', 'Bang', 'Khoa', 'Truoc', 'Sau'],
  // Chuyền sản xuất. Ma để dạng chữ để giữ số 0 đầu ("01", "06"). SoMau: 1 màu (chỉ PB1 = JA1–4) hoặc 2 màu (PB1 = JA1–4, PB2 = JA5–8).
  // SeriDau/ThayDau/ThayLoc là của đầu in lắp trên chuyền, không theo sản phẩm
  Chuyen: ['ID', 'Ma', 'SoMau', 'GhiChu', 'ThuTu', 'HoatDong', 'CapNhat', 'OpId', 'SeriDau', 'ThayDau', 'ThayLoc', 'MauPB1', 'MauPB2'],
  // Sản phẩm: chiều dài miếng (mm) chính là Length ở màn Form Specification (máy hiện inch)
  SanPham: ['ID', 'Ma', 'Ten', 'TenDich', 'DaiSP', 'GhiChu', 'HoatDong', 'CapNhat', 'OpId', 'DichTay'],
  // Chuyền nào có những sản phẩm nào (cùng sản phẩm ở hai chuyền thì thông số khác nhau)
  ChuyenSP: ['ID', 'Chuyen', 'SanPham', 'HoatDong', 'CapNhat', 'OpId'],
  // Lịch sử chạy: mỗi lần chuyển sản phẩm một dòng; dòng mới nhất theo TuNgay là sản phẩm đang chạy
  ChaySP: ['ID', 'Chuyen', 'SanPham', 'TuNgay', 'LucTao', 'OpId', 'Xoa'],
  // Thông số theo chuyền + sản phẩm, chia đúng các màn hình bộ điều khiển Merlin D CE.
  // KHÔNG sửa dòng cũ: mỗi lần đổi là một dòng mới (ngày áp dụng + lý do) để tra lại "trước khi in mờ đang đặt bao nhiêu".
  // Số để dạng chữ: ô trống là "chưa ghi", khác số 0. Align/Volt: 4 hoặc 8 số (JA1–4, JA5–8) cách nhau bởi "/".
  // NhietBinh/Lois/Muc hậu tố 1 = PB1, 2 = PB2 (máy 1 màu bỏ trống …2).
  ThongSo: ['ID', 'Chuyen', 'SanPham', 'SoMau', 'ApDung', 'GhiChu', 'GhiChuDich',
    'EncDir', 'EncDecode', 'EncDPI', 'Divider', 'TriggerMode', 'FireMode', 'FormDelay', 'Align', 'Registration', 'Volt',
    'Meniscus', 'LungVac', 'PurgeShort', 'PurgeLong', 'NhietTam', 'NhietBinh1', 'Lois1', 'Muc1', 'NhietBinh2', 'Lois2', 'Muc2', 'TocDo',
    'LucTao', 'OpId', 'Xoa', 'DichTay'],
  // Bảng chương trình PLC của từng chuyền (file Excel IO / báo lỗi / chú thích M-D-B-W…): tệp nằm ở TaiLieu (nhóm "Chương trình PLC"),
  // trang này chỉ nối chuyền ↔ MaTL. Tải bản mới cho cùng chuyền = phiên bản mới của cùng MaTL. App tự đọc tệp để tra cứu, máy chủ không bóc tách.
  BangMay: ['ID', 'Chuyen', 'MaTL', 'CapNhat', 'OpId', 'Xoa']
};
// Cột lưu dạng số (còn lại để dạng chữ "@" — tránh Sheets tự đổi "1-2" thành ngày, "007" thành 7)
var COT_SO = {
  NguoiDung: ['HoatDong'], GhiChu: ['Xoa'], NhomTL: ['ThuTu', 'HoatDong'], TaiLieu: ['KichThuoc', 'PhienBan', 'HienHanh', 'Xoa'],
  DayDien: ['Trang', 'Xoa'], CauHinhMay: ['EncoderPPR', 'DuongKinh', 'SoCanh', 'Divider', 'DaiSP', 'TocDo', 'KhoangJA', 'KhoangPB', 'BuPB', 'GioiHan', 'Xoa'],
  NhatKy: [], Chuyen: ['SoMau', 'ThuTu', 'HoatDong'], SanPham: ['HoatDong'], ChuyenSP: ['HoatDong'], ChaySP: ['Xoa'], ThongSo: ['SoMau', 'Xoa'], BangMay: ['Xoa']
};
var COT_DD = { CauHinhMay: { DuongKinh: '0.###', KhoangJA: '0.####', KhoangPB: '0.####', BuPB: '0.###', GioiHan: '0.##', DaiSP: '0.##' } };
var HANH_DONG_GHI = ['changePin', 'noteSave', 'noteDelete', 'groupSave', 'docUpload', 'docLink', 'docSave', 'docCurrent', 'docDelete',
  'wireSave', 'wireImport', 'wireDelete', 'cfgSave', 'cfgDelete', 'lineSave', 'productSave', 'lineProduct', 'runSet', 'paramSave', 'paramDelete', 'plcUpload', 'plcDelete'];
var KIEU_TL = ['FILE', 'LINK'];
var NHOM_MAU = [['Sổ tay thiết bị', '设备手册'], ['Bản vẽ điện', '电气图纸'], ['Quy trình', '操作规程'], ['Khác', '其他']];
// Thông số máy in hiện tại (đầu in Galaxy 80 HM, bộ điều khiển Merlin D CE). Khoảng cách JA/PB lấy theo bảng tính của nhà cung cấp.
var CAU_HINH_MAU = { ten: 'Máy in phun băng vệ sinh · 卫生巾喷码机', encoderPPR: 2500, duongKinh: 120, soCanh: 4, divider: 6, daiSP: 190,
  tocDo: 900, khoangJA: 27.4333, khoangPB: 33.528, buPB: 1.8, gioiHan: 8 };
// Các chuyền đang có lúc cài đặt: [mã chuyền, số màu]. Thêm/sửa chuyền sau này làm trong app.
var CHUYEN_MAU = [['01', 1], ['09', 1], ['21', 1], ['16', 1], ['23', 2], ['06', 2], ['08', 2], ['27', 2], ['18', 2]];
// Thông số dạng số: [khoá, nhỏ nhất, lớn nhất, tên báo lỗi]. Chặn ở máy chủ để gõ nhầm (50 thay 5.0) không thành "thông số hiện tại"
var TS_SO = [['encDPI', 1, 10000, 'Encoder DPI'], ['divider', 1, 1000, 'Divider'], ['formDelay', 0, 1000, 'Form Delay (in)'],
  ['registration', -1000000, 1000000, 'Image Registration'], ['meniscus', -100, 100, 'Meniscus Set point'], ['lungVac', -100, 100, 'Lung Vacuum'],
  ['purgeShort', 0, 10, 'Short Purge (s)'], ['purgeLong', 0, 10, 'Long Purge (s)'], ['nhietTam', 0, 250, 'Plate Set point (°C)'], ['tocDo', 0, 100000, 'Tốc độ · 速度']];
var TS_SO_PB = [['nhietBinh', 0, 250, 'Reservoir Set point (°C)'], ['lois', 0, 100000, 'LOIS Set point']];
// Giá trị chọn sẵn đúng như trên màn hình máy
var TS_CHON = { encDir: ['Forward', 'Reverse'], encDecode: ['Single Edge', 'Two Edges', 'All Four Edges'], triggerMode: ['Auto', 'Once per Image'], fireMode: ['External', 'Internal'] };

function doGet() {
  return traVe({ ok: true, data: { app: 'ghi-chu-tai-lieu', phienBan: PHIEN_BAN } });
}
function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (x) { return traVe({ ok: false, code: 'YEU_CAU', message: 'Yêu cầu không hợp lệ · 请求无效' }); }
  return traVe(xuLy(req));
}
function traVe(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

var DU_COT = {};      // trang đã kiểm đủ cột trong lần chạy này
var DICH_LOI = false; // Google Dịch đã lỗi trong lần chạy này → không gọi tiếp cho đỡ chậm

function xuLy(req) {
  DU_COT = {}; DICH_LOI = false;
  var kq, lock = null;
  try {
    req = req || {};
    var a = String(req.action || '');
    // Ghi phải tuần tự: hai lần gửi cùng lúc (hàng chờ + bấm tay) không được cấp trùng mã hay ghi đè nhau
    if (HANH_DONG_GHI.indexOf(a) >= 0) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) throw loi('BAN', 'Máy chủ đang bận · 服务器繁忙');
    }
    kq = { ok: true, data: dieuHuong(a, req.payload || {}, req) };
  } catch (e) {
    kq = { ok: false, code: (e && e.code) || 'LOI', message: String((e && e.message) || e) };
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) { /* bỏ qua */ } }
  }
  return kq;
}

function dieuHuong(a, p, req) {
  if (a === 'ping') return { phienBan: PHIEN_BAN };
  if (a === 'login') return dangNhap(p, req.device);
  var u = xacThuc(req.token), op = s(req.opId);
  switch (a) {
    case 'data': return layDuLieu();
    case 'changePin': return doiPin(u, p);
    case 'noteSave': return luuGhiChu(p, op);
    case 'noteDelete': return xoaGhiChu(p);
    case 'photo': return docAnh(p);
    case 'groupSave': return luuNhom(p, op);
    case 'docUpload': return taiLenTL(p, op);
    case 'docLink': return themLienKet(p, op);
    case 'docSave': return suaTL(p);
    case 'docCurrent': return datHienHanh(p);
    case 'docDelete': return xoaTL(p);
    case 'docGet': return layTep(p);
    case 'wireSave': return luuDay(p, op);
    case 'wireImport': return nhapDay(p, op);
    case 'wireDelete': return xoaDay(p);
    case 'cfgSave': return luuCauHinh(p, op);
    case 'cfgDelete': return xoaCauHinh(p);
    case 'audit': return docNhatKy(p);
    case 'lineSave': return luuChuyen(p, op);
    case 'productSave': return luuSanPham(p, op);
    case 'lineProduct': return ganSanPham(p, op);
    case 'runSet': return chuyenSanPham(p, op);
    case 'paramSave': return luuThongSo(p, op);
    case 'paramDelete': return xoaThongSo(p);
    case 'plcUpload': return taiBangMay(p, op);
    case 'plcDelete': return xoaBangMay(p);
    case 'translate': return dichMotDong(p);
  }
  throw loi('KHONG_HIEU', 'Máy chủ chưa hiểu yêu cầu này · 服务器无法识别: ' + a);
}

// ===================== Tiện ích =====================
function loi(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
function s(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
function hd(v) { return !(v === 0 || v === '0' || v === false || v === '' || String(v).toUpperCase() === 'FALSE'); }
function catChu(v, n) { return s(v).replace(/\s+/g, ' ').slice(0, n); }
function catNhieuDong(v, n) { return s(v).replace(/\r/g, '').slice(0, n); }
// Chặn chữ bắt đầu bằng = + - @ bị Google Sheets hiểu là công thức (ví dụ số dây "-24V" hay ghi chú "=> thay lọc")
function anToan(v) { v = v === null || v === undefined ? '' : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; }
// Đọc lại: bỏ dấu nháy đã chèn để người dùng thấy đúng chữ mình gõ
function boNhay(v) { v = s(v); return /^'[=+\-@]/.test(v) ? v.slice(1) : v; }
function bayGio() { return new Date(Date.now() + (typeof __clock !== 'undefined' ? __clock.off : 0)); }
function thoiGianStr() { return Utilities.formatDate(bayGio(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function tgStr(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss') : s(v); }
function hex(b) { return b.map(function (x) { var h = ((x + 256) % 256).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
function docJson(v, macDinh) {
  var t = s(v); if (!t) return macDinh;
  try { var o = JSON.parse(t); return o === null || o === undefined ? macDinh : o; } catch (e) { return macDinh; }
}
function soHuu(v, mac) { var n = Number(v); return isFinite(n) ? n : mac; }
// Mã bản ghi: lấy theo opId khi có, để máy tạo bản ghi lúc mất mạng biết trước mã và gửi lại không sinh bản trùng
function maTuOp(tien, op) { return tien + s(op).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-18); }
function idMoi(tien, daCo) {
  var dau = tien + Utilities.formatDate(bayGio(), TZ, 'yyMMddHHmmss'), i = 1, id;
  do { id = dau + ('00' + i).slice(-3); i++; } while (daCo[id]);
  daCo[id] = 1;
  return id;
}
function dsIdCo(ds) { var o = {}; ds.forEach(function (x) { o[x.id] = 1; }); return o; }
function dsThe(v) {
  var a = Array.isArray(v) ? v : s(v).split(/[,;#\n]/), out = [], co = {};
  a.forEach(function (t) {
    t = catChu(t, 40).replace(/^#/, '');
    var k = t.toLowerCase();
    if (t && !co[k] && out.length < THE_TOI_DA) { co[k] = 1; out.push(t); }
  });
  return out;
}

// ===================== Trang tính =====================
function trang(ten) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(ten), cot = BANG[ten];
  if (!sh) {
    sh = ss.insertSheet(ten);
    if (sh.getMaxColumns() < cot.length) sh.insertColumnsAfter(sh.getMaxColumns(), cot.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, cot.length).setValues([cot]).setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    cot.forEach(function (c, i) { sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat(dinhDangCot(ten, c)); });
    DU_COT[ten] = 1;
  } else if (!DU_COT[ten]) {
    // Nâng cấp: bản mới có thêm cột ở cuối → thêm cột vào sheet và ghi lại dòng tiêu đề, dữ liệu cũ giữ nguyên
    if (sh.getMaxColumns() < cot.length) sh.insertColumnsAfter(sh.getMaxColumns(), cot.length - sh.getMaxColumns());
    var td = sh.getRange(1, 1, 1, cot.length).getValues()[0];
    if (td.join('|') !== cot.join('|')) {
      sh.getRange(1, 1, 1, cot.length).setValues([cot]).setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF');
    }
    DU_COT[ten] = 1;
  }
  return sh;
}
function dinhDangCot(ten, c) { return (COT_DD[ten] || {})[c] || ((COT_SO[ten] || []).indexOf(c) >= 0 ? '0' : '@'); }
function dinhDang(ten) { return BANG[ten].map(function (c) { return dinhDangCot(ten, c); }); }
function docTho(ten) {
  var sh = trang(ten), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, BANG[ten].length).getValues();
}
function themNhieu(ten, rows) {
  if (!rows.length) return;
  var sh = trang(ten), r = sh.getLastRow() + 1, can = r + rows.length - 1;
  if (can > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), can - sh.getMaxRows() + 200);
  var dd = dinhDang(ten);
  sh.getRange(r, 1, rows.length, BANG[ten].length).setNumberFormats(rows.map(function () { return dd; })).setValues(rows);
}
function suaDong(ten, r, arr) {
  trang(ten).getRange(r, 1, 1, arr.length).setNumberFormats([dinhDang(ten)]).setValues([arr]);
}
// Bảng ↔ đối tượng theo tên cột: khoá là tên cột viết thường chữ đầu (TieuDeDich → tieuDeDich)
function khoa(c) { return c === 'ID' ? 'id' : c === 'OpId' ? 'opId' : c === 'TaiLieuID' ? 'taiLieuId' : c === 'EncoderPPR' ? 'encoderPPR' : c === 'DPI' ? 'dpi' : c.charAt(0).toLowerCase() + c.slice(1); }
function tuDong(ten, r, i) {
  var o = { _r: i + 2 };
  BANG[ten].forEach(function (c, j) {
    var v = r[j];
    o[khoa(c)] = (COT_SO[ten] || []).indexOf(c) >= 0 ? (v === '' || v === null ? 0 : Number(v) || 0) : boNhay(tgStr(v));
  });
  return o;
}
function thanhDong(ten, o) {
  return BANG[ten].map(function (c) {
    var v = o[khoa(c)];
    if ((COT_SO[ten] || []).indexOf(c) >= 0) return v === '' || v === null || v === undefined ? '' : Number(v) || 0;
    return anToan(v === null || v === undefined ? '' : v);
  });
}
function docBang(ten) { return docTho(ten).map(function (r, i) { return tuDong(ten, r, i); }).filter(function (x) { return x.id; }); }
function congKhai(o) { var c = {}; Object.keys(o).forEach(function (k) { if (k.charAt(0) !== '_') c[k] = o[k]; }); return c; }

// Nhật ký sửa đổi: ai (chỉ một người dùng), lúc nào, trước, sau — để tra lại khi sửa nhầm
function ghiNhatKy(hanhDong, bang, khoaBG, truoc, sau) {
  var cat = function (o) { if (!o) return ''; var t = JSON.stringify(congKhai(o)); return t.length > 4000 ? t.slice(0, 4000) + '…' : t; };
  themNhieu('NhatKy', [thanhDong('NhatKy', { id: 'NK' + Utilities.formatDate(bayGio(), TZ, 'yyMMddHHmmss') + Math.floor(100 + Math.random() * 900),
    thoiGian: thoiGianStr(), hanhDong: hanhDong, bang: bang, khoa: khoaBG, truoc: cat(truoc), sau: cat(sau) })]);
}
function docNhatKy(p) {
  var bang = s(p.bang), k = s(p.khoa);
  var ds = docBang('NhatKy').filter(function (x) { return (!bang || x.bang === bang) && (!k || x.khoa === k); });
  return { nhatKy: ds.slice(-200).reverse().map(congKhai) };
}

// ===================== Đăng nhập =====================
function thuocTinh(k) {
  var p = PropertiesService.getScriptProperties(), v = p.getProperty(k);
  if (!v) { v = Utilities.getUuid() + Utilities.getUuid(); p.setProperty(k, v); }
  return v;
}
function bamPin(pin) {
  return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, thuocTinh('SALT') + '|' + pin, Utilities.Charset.UTF_8));
}
function kyTen(base, pinHash) {
  var sig = Utilities.computeHmacSha256Signature(base + '.' + pinHash, thuocTinh('TOKEN_KEY'));
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '').slice(0, 32);
}
function nguoiDung() { return docBang('NguoiDung').filter(function (x) { return x.hoatDong; })[0] || null; }
function taoToken(u) {
  var base = u.id + '.' + (bayGio().getTime() + HAN_PHIEN_NGAY * 86400000);
  return base + '.' + kyTen(base, u.pinHash);
}
// Token ký theo PinHash: đổi PIN là mọi phiên cũ (máy bị mất…) tự hết hiệu lực
function xacThuc(token) {
  var p = s(token).split('.');
  if (p.length !== 3 || !(Number(p[1]) > bayGio().getTime())) throw loi('HET_PHIEN', 'Hết phiên đăng nhập · 登录已过期');
  var u = nguoiDung();
  if (!u || u.id !== p[0] || kyTen(p[0] + '.' + p[1], u.pinHash) !== p[2]) throw loi('HET_PHIEN', 'Hết phiên đăng nhập · 登录已过期');
  return u;
}
function dangNhap(p, device) {
  var pin = s(p.pin), cache = CacheService.getScriptCache();
  var kMay = 'sai_' + s(device).slice(0, 60), nMay = Number(cache.get(kMay)) || 0, nAll = Number(cache.get('sai_all')) || 0;
  if (nMay >= 5) throw loi('KHOA', 'Sai PIN nhiều lần, thử lại sau 5 phút · PIN错误次数过多，请5分钟后再试');
  if (nAll >= 20) throw loi('KHOA_HT', 'Hệ thống tạm khoá 10 phút · 系统暂时锁定10分钟');
  var u = nguoiDung();
  if (!u) { caiDatBanDau(); u = nguoiDung(); }
  if (!/^\d{6}$/.test(pin) || bamPin(pin) !== u.pinHash) {
    cache.put(kMay, String(nMay + 1), 300);
    cache.put('sai_all', String(nAll + 1), 600);
    throw loi('PIN_SAI', 'PIN không đúng · PIN错误');
  }
  cache.remove(kMay);
  return { token: taoToken(u), me: { ten: u.ten }, macDinh: pin === '111111' };
}
function doiPin(u, p) {
  if (bamPin(s(p.cu)) !== u.pinHash) throw loi('PIN_SAI', 'PIN cũ không đúng · 旧PIN错误');
  var moi = s(p.moi);
  if (!/^\d{6}$/.test(moi)) throw loi('PIN_6', 'PIN phải gồm 6 chữ số · PIN须为6位数字');
  if (moi === '111111') throw loi('PIN_YEU', 'Không dùng lại PIN mặc định · 不能使用默认PIN');
  // Chặn PIN dễ đoán (cả 6 số giống nhau, dãy tăng/giảm như 123456, 654321): người nhặt được điện thoại thử mấy PIN này đầu tiên
  if (/^(\d)\1{5}$/.test(moi) || '0123456789'.indexOf(moi) >= 0 || '9876543210'.indexOf(moi) >= 0) throw loi('PIN_YEU', 'PIN quá dễ đoán · PIN太简单');
  u.pinHash = bamPin(moi);
  suaDong('NguoiDung', u._r, thanhDong('NguoiDung', u));
  ghiNhatKy('doiPin', 'NguoiDung', u.id, null, null);
  return { token: taoToken(u) };
}

// ===================== Song ngữ =====================
var CJK_RE = /[㐀-鿿豈-﫿]/g;
var CHU_RE = /[A-Za-zÀ-ỹ]/g;
var VI_DAU_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;
function demKyTu(t, re) { var m = String(t || '').match(re); return m ? m.length : 0; }
function laTiengTrung(t) { var c = demKyTu(t, CJK_RE); return c > 0 && c * 2 >= demKyTu(t, CHU_RE); }
// Có cần dịch không: có chữ thật (bỏ qua mã như PS1, J53-14, số), và chưa viết sẵn cả hai thứ tiếng
function canDich(t) {
  t = s(t);
  var chu = t.replace(/\S*\d\S*/g, ' ');
  if (!t || !(demKyTu(chu, CJK_RE) >= 1 || demKyTu(chu, CHU_RE) >= 2)) return false;
  return !(demKyTu(t, CJK_RE) >= 2 && demKyTu(t, VI_DAU_RE) >= 2);
}
function giaiMa(t) { return String(t).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
function dichChu(t) {
  t = s(t);
  if (DICH_LOI || !canDich(t)) return '';
  var zh = laTiengTrung(t);
  try {
    return s(giaiMa(LanguageApp.translate(t, zh ? 'zh-CN' : 'vi', zh ? 'vi' : 'zh-CN', { contentType: 'text' }))).slice(0, 4000);
  } catch (e) {
    DICH_LOI = true;   // hết hạn mức dịch trong ngày: lưu chữ gốc, lần sửa sau sẽ dịch lại
    console.log('dichChu: ' + (e && e.message || e));
    return '';
  }
}
// Trả bản dịch cho một trường.
//   tay = true: người dùng vừa sửa bản dịch bằng tay → dùng đúng chữ đó và đánh dấu để về sau không dịch đè.
//   tay = false, bản dịch gửi rỗng: người dùng xoá bản dịch → bỏ dấu sửa tay, dịch lại từ đầu.
//   Không gửi bản dịch: đã sửa tay thì giữ nguyên; chưa thì dịch lại khi chữ gốc đổi hoặc chưa có bản dịch.
function dichTruong(moi, cu, dichCu, dichGui, daSuaTay) {
  if (dichGui !== undefined && dichGui !== null) {
    if (s(dichGui)) return { dich: s(dichGui).slice(0, 4000), tay: true };
    return { dich: dichChu(moi), tay: false };
  }
  if (daSuaTay) return { dich: dichCu, tay: true };
  if (s(moi) === s(cu) && s(dichCu)) return { dich: dichCu, tay: false };
  return { dich: dichChu(moi), tay: false };
}
function apDich(x, cu, p, truong, truongDich, dichTay) {
  var r = dichTruong(x[truong], cu ? cu[truong] : '', cu ? cu[truongDich] : '', p[truongDich], !!dichTay[truong]);
  x[truongDich] = r.dich;
  if (r.tay) dichTay[truong] = 1; else delete dichTay[truong];
}

// ===================== Dữ liệu tổng =====================
function layDuLieu() {
  ['GhiChu', 'NhomTL', 'TaiLieu', 'DayDien', 'CauHinhMay', 'NhatKy', 'Chuyen', 'SanPham', 'ChuyenSP', 'ChaySP', 'ThongSo', 'BangMay'].forEach(trang);
  var chuyen = docBang('Chuyen');
  if (!chuyen.length) chuyen = taoChuyenMau();
  var nhom = docBang('NhomTL');
  if (!nhom.length) nhom = taoNhomMau();
  var ch = docBang('CauHinhMay');
  if (!ch.length) ch = [taoCauHinhMau()];
  return {
    phienBan: PHIEN_BAN,
    ghiChu: docBang('GhiChu').filter(function (x) { return !x.xoa; }).map(sachGC),
    nhom: nhom.filter(function (x) { return x.hoatDong; }).map(sachNhom).sort(function (a, b) { return a.thuTu - b.thuTu; }),
    taiLieu: docBang('TaiLieu').filter(function (x) { return !x.xoa; }).map(sachTL),
    dayDien: docBang('DayDien').filter(function (x) { return !x.xoa; }).map(sachDay),
    cauHinh: ch.filter(function (x) { return !x.xoa; }).map(congKhai),
    chuyen: chuyen.filter(function (x) { return x.hoatDong; }).map(sachChuyen).sort(function (a, b) { return a.thuTu - b.thuTu; }),
    sanPham: docBang('SanPham').filter(function (x) { return x.hoatDong; }).map(sachSP),
    chuyenSP: docBang('ChuyenSP').filter(function (x) { return x.hoatDong; }).map(function (x) { return { id: x.id, chuyen: x.chuyen, sanPham: x.sanPham }; }),
    chaySP: docBang('ChaySP').filter(function (x) { return !x.xoa; }).map(congKhai),
    thongSo: docBang('ThongSo').filter(function (x) { return !x.xoa; }).map(sachTS),
    bangMay: docBang('BangMay').filter(function (x) { return !x.xoa; }).map(congKhai)
  };
}

// ===================== Ghi chú =====================
function sachGC(x) {
  var o = congKhai(x);
  o.the = docJson(x.the, []); o.anh = docJson(x.anh, []); o.dichTay = docJson(x.dichTay, {});
  return o;
}
function luuAnhVaoDrive(ds, tien) {
  return (ds || []).slice(0, ANH_TOI_DA).map(function (a, i) {
    var mime = /^image\/(jpeg|png|webp)$/.test(s(a.mime)) ? s(a.mime) : 'image/jpeg';
    var bytes = Utilities.base64Decode(s(a.b64));
    if (!bytes.length) throw loi('ANH_RONG', 'Ảnh rỗng · 图片为空');
    if (bytes.length > 8 * 1024 * 1024) throw loi('ANH_LON', 'Ảnh quá lớn (tối đa 8 MB) · 图片过大');
    var f = thuMuc('Anh').createFile(Utilities.newBlob(bytes, mime, tien + '-' + (i + 1) + '.jpg'));
    return f.getId();
  });
}
function luuGhiChu(p, op) {
  var ds = docBang('GhiChu'), id = s(p.id), cu = null;
  if (op) {
    var trung = ds.filter(function (x) { return x.opId === op; })[0];
    if (trung) return { dup: true, ghiChu: sachGC(trung) };
  }
  if (id) cu = ds.filter(function (x) { return x.id === id; })[0] || null;
  if (cu && cu.xoa) throw loi('DA_XOA', 'Ghi chú đã bị xoá · 笔记已删除');
  var tieuDe = catChu(p.tieuDe, 200), noiDung = catNhieuDong(p.noiDung, 20000);
  if (!tieuDe && !noiDung) throw loi('TRONG', 'Nhập tiêu đề hoặc nội dung · 请输入标题或内容');
  if (!tieuDe) tieuDe = catChu(noiDung.split('\n')[0], 80);
  var bay = thoiGianStr();
  var x = cu ? sachGC(cu) : { id: id && /^GC[A-Z0-9]{6,24}$/.test(id) && !dsIdCo(ds)[id] ? id : (op ? maTuOp('GC', op) : idMoi('GC', dsIdCo(ds))),
    tieuDe: '', tieuDeDich: '', noiDung: '', noiDungDich: '', the: [], anh: [], maMay: '', lucTao: bay, dichTay: {} };
  if (!cu && dsIdCo(ds)[x.id]) x.id = idMoi('GC', dsIdCo(ds));
  var truoc = cu ? sachGC(cu) : null, dichTay = x.dichTay || {};
  x.tieuDe = tieuDe; x.noiDung = noiDung;
  apDich(x, truoc, p, 'tieuDe', 'tieuDeDich', dichTay);
  apDich(x, truoc, p, 'noiDung', 'noiDungDich', dichTay);
  x.the = dsThe(p.the); x.maMay = catChu(p.maMay, 40);
  // Ảnh: giữ các ảnh cũ còn trong danh sách gửi lên (xoá bớt được), thêm ảnh mới chụp
  var giu = Array.isArray(p.anh) ? p.anh.filter(function (f) { return (x.anh || []).indexOf(f) >= 0; }) : (x.anh || []);
  var moi = luuAnhVaoDrive(p.anhMoi, x.id);
  x.anh = giu.concat(moi).slice(0, ANH_TOI_DA);
  x.capNhat = bay; x.opId = op || x.opId || ''; x.xoa = 0;
  var dong = thanhDong('GhiChu', { id: x.id, tieuDe: x.tieuDe, tieuDeDich: x.tieuDeDich, noiDung: x.noiDung, noiDungDich: x.noiDungDich,
    the: x.the.length ? JSON.stringify(x.the) : '', anh: x.anh.length ? JSON.stringify(x.anh) : '', maMay: x.maMay, lucTao: x.lucTao,
    capNhat: bay, opId: x.opId, xoa: 0, dichTay: Object.keys(dichTay).length ? JSON.stringify(dichTay) : '' });
  if (cu) suaDong('GhiChu', cu._r, dong); else themNhieu('GhiChu', [dong]);
  var sau = sachGC(tuDong('GhiChu', dong, -1));
  ghiNhatKy(cu ? 'sua' : 'tao', 'GhiChu', x.id, truoc, sau);
  return { ghiChu: sau };
}
// Không xoá dòng: đánh dấu Xoa = 1 để còn khôi phục được và nhật ký vẫn trỏ đúng
function xoaGhiChu(p) {
  var x = docBang('GhiChu').filter(function (r) { return r.id === s(p.id); })[0];
  if (!x) throw loi('KHONG_THAY', 'Không thấy ghi chú · 找不到笔记');
  if (x.xoa) return { id: x.id, dup: true };
  var truoc = sachGC(x);
  x.xoa = 1; x.capNhat = thoiGianStr();
  suaDong('GhiChu', x._r, thanhDong('GhiChu', x));
  ghiNhatKy('xoa', 'GhiChu', x.id, truoc, null);
  return { id: x.id };
}
// Ảnh chỉ trả khi thuộc một ghi chú: không cho đọc tệp Drive bất kỳ bằng mã đoán được
function docAnh(p) {
  var id = s(p.id), thuoc = docBang('GhiChu').some(function (x) { return !x.xoa && docJson(x.anh, []).indexOf(id) >= 0; });
  if (!thuoc) throw loi('KHONG_THAY', 'Không thấy ảnh · 找不到图片');
  var b = DriveApp.getFileById(id).getBlob();
  return { id: id, mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()) };
}

// ===================== Nhóm tài liệu =====================
function sachNhom(x) { return { id: x.id, ten: x.ten, tenZh: x.tenZh, thuTu: x.thuTu }; }
function taoNhomMau() {
  var bay = thoiGianStr();
  themNhieu('NhomTL', NHOM_MAU.map(function (n, i) {
    return thanhDong('NhomTL', { id: 'NH0' + (i + 1), ten: n[0], tenZh: n[1], thuTu: i + 1, hoatDong: 1, capNhat: bay, opId: '' });
  }));
  return docBang('NhomTL');
}
function luuNhom(p, op) {
  var ds = docBang('NhomTL'), ten = catChu(p.ten, 80);
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, nhom: sachNhom(t) }; }
  if (!ten) throw loi('TRONG', 'Nhập tên nhóm · 请输入分组名称');
  var cu = s(p.id) ? ds.filter(function (x) { return x.id === s(p.id); })[0] : null;
  if (s(p.id) && !cu) throw loi('KHONG_THAY', 'Không thấy nhóm · 找不到分组');
  var trung = ds.filter(function (x) { return x.hoatDong && x.ten.toLowerCase() === ten.toLowerCase() && (!cu || x.id !== cu.id); })[0];
  if (trung) throw loi('TRUNG', 'Đã có nhóm này · 分组已存在');
  var truoc = cu ? congKhai(cu) : null;
  var x = cu || { id: op ? maTuOp('NH', op) : idMoi('NH', dsIdCo(ds)), thuTu: ds.length + 1 };
  x.ten = ten;
  x.tenZh = s(p.tenZh) ? catChu(p.tenZh, 80) : (cu && cu.ten === ten ? cu.tenZh : dichChu(ten));
  x.hoatDong = p.hoatDong === undefined ? 1 : (hd(p.hoatDong) ? 1 : 0);
  if (p.thuTu !== undefined) x.thuTu = soHuu(p.thuTu, x.thuTu);
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || '';
  if (!x.hoatDong && docBang('TaiLieu').some(function (t) { return !t.xoa && t.nhom === x.id; })) {
    throw loi('CON_TL', 'Nhóm còn tài liệu, chuyển tài liệu sang nhóm khác trước · 分组内还有文件');
  }
  if (cu) suaDong('NhomTL', cu._r, thanhDong('NhomTL', x)); else themNhieu('NhomTL', [thanhDong('NhomTL', x)]);
  ghiNhatKy(cu ? 'sua' : 'tao', 'NhomTL', x.id, truoc, x);
  return { nhom: sachNhom(x) };
}

// ===================== Tài liệu =====================
function sachTL(x) { var o = congKhai(x); o.the = docJson(x.the, []); o.dichTay = docJson(x.dichTay, {}); o.hienHanh = !!x.hienHanh; return o; }
function thuMuc(loai) {
  var k = 'THU_MUC_' + loai, ps = PropertiesService.getScriptProperties(), id = ps.getProperty(k);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* thư mục bị xoá → tạo lại */ } }
  var goc = ps.getProperty('THU_MUC_GOC'), g = null;
  if (goc) { try { g = DriveApp.getFolderById(goc); } catch (e) { g = null; } }
  if (!g) { g = DriveApp.createFolder('Ghi chú & Tài liệu · 笔记与资料'); ps.setProperty('THU_MUC_GOC', g.getId()); }
  var f = g.createFolder(loai === 'Anh' ? 'Ảnh ghi chú · 笔记图片' : 'Tài liệu · 资料');
  ps.setProperty(k, f.getId());
  return f;
}
function kiemNhom(id) {
  if (!docBang('NhomTL').some(function (x) { return x.id === id && x.hoatDong; })) throw loi('NHOM', 'Chọn nhóm tài liệu · 请选择分组');
}
// Thêm một phiên bản: maTL trùng tài liệu cũ → thành phiên bản mới nhất và là bản đang hiệu lực
function themPhienBan(ds, x, maTL) {
  var cung = ds.filter(function (t) { return !t.xoa && t.maTL === maTL; });
  x.maTL = maTL;
  x.phienBan = cung.reduce(function (m, t) { return Math.max(m, t.phienBan || 0); }, 0) + 1;
  x.hienHanh = 1;
  cung.forEach(function (t) {
    if (t.hienHanh) { t.hienHanh = 0; t.capNhat = x.capNhat; suaDong('TaiLieu', t._r, thanhDong('TaiLieu', t)); }
  });
}
function tlMoi(ds, p, op, kieu) {
  var ten = catChu(p.ten, 200), bay = thoiGianStr();
  if (!ten) throw loi('TRONG', 'Nhập tên tài liệu · 请输入文件名称');
  var nhom = s(p.nhom); kiemNhom(nhom);
  var maTL = s(p.maTL);
  if (maTL && !ds.some(function (t) { return !t.xoa && t.maTL === maTL; })) throw loi('KHONG_THAY', 'Không thấy tài liệu gốc · 找不到原文件');
  var id = op ? maTuOp('TL', op) : idMoi('TL', dsIdCo(ds));
  if (dsIdCo(ds)[id]) id = idMoi('TL', dsIdCo(ds));
  var x = { id: id, ten: ten, nhom: nhom, kieu: kieu, the: dsThe(p.the), lucTao: bay, capNhat: bay, opId: op || '', xoa: 0 };
  var dichTay = {};
  apDich(x, null, p, 'ten', 'tenDich', dichTay);
  x.dichTay = dichTay;
  themPhienBan(ds, x, maTL || maTuOp('MT', id));
  return x;
}
function ghiTLMoi(x) {
  var o = {}; Object.keys(x).forEach(function (k) { o[k] = x[k]; });
  o.the = x.the.length ? JSON.stringify(x.the) : ''; o.dichTay = Object.keys(x.dichTay || {}).length ? JSON.stringify(x.dichTay) : '';
  var dong = thanhDong('TaiLieu', o);
  themNhieu('TaiLieu', [dong]);
  var sau = sachTL(tuDong('TaiLieu', dong, -1));
  ghiNhatKy('tao', 'TaiLieu', x.id, null, sau);
  return sau;
}
function taiLenTL(p, op) {
  var ds = docBang('TaiLieu');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, taiLieu: sachTL(t) }; }
  var tenTep = catChu(p.tenTep, 200) || 'tep', mime = catChu(p.mime, 120) || 'application/octet-stream';
  var bytes = Utilities.base64Decode(s(p.b64));
  if (!bytes.length) throw loi('TEP_RONG', 'Tệp rỗng · 文件为空');
  if (bytes.length > TEP_TOI_DA) throw loi('TEP_LON', 'Tệp quá lớn (tối đa 25 MB), hãy dán link Google Drive · 文件过大，请粘贴Drive链接');
  var x = tlMoi(ds, p, op, 'FILE');
  var f = thuMuc('TaiLieu').createFile(Utilities.newBlob(bytes, mime, tenTep));
  x.fileId = f.getId(); x.mime = mime; x.kichThuoc = bytes.length; x.tenTep = tenTep; x.url = '';
  return { taiLieu: ghiTLMoi(x) };
}
function laLinkHopLe(u) { return /^https:\/\/(drive|docs)\.google\.com\//.test(u) || /^https:\/\/[^\s]+$/.test(u); }
function themLienKet(p, op) {
  var ds = docBang('TaiLieu');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, taiLieu: sachTL(t) }; }
  var url = s(p.url).slice(0, 1000);
  if (!laLinkHopLe(url)) throw loi('LINK', 'Link phải bắt đầu bằng https:// · 链接须以https://开头');
  var x = tlMoi(ds, p, op, 'LINK');
  x.url = url; x.fileId = ''; x.mime = ''; x.kichThuoc = 0; x.tenTep = '';
  return { taiLieu: ghiTLMoi(x) };
}
function timTL(id) {
  var x = docBang('TaiLieu').filter(function (t) { return t.id === s(id); })[0];
  if (!x || x.xoa) throw loi('KHONG_THAY', 'Không thấy tài liệu · 找不到文件');
  return x;
}
function suaTL(p) {
  var x = timTL(p.id), truoc = sachTL(x), dichTay = docJson(x.dichTay, {});
  if (p.ten !== undefined) { var ten = catChu(p.ten, 200); if (!ten) throw loi('TRONG', 'Nhập tên tài liệu · 请输入文件名称'); x.ten = ten; }
  apDich(x, truoc, p, 'ten', 'tenDich', dichTay);
  if (p.nhom !== undefined) { kiemNhom(s(p.nhom)); x.nhom = s(p.nhom); }
  if (p.the !== undefined) x.the = JSON.stringify(dsThe(p.the)); else x.the = JSON.stringify(truoc.the);
  if (p.url !== undefined && x.kieu === 'LINK') { if (!laLinkHopLe(s(p.url))) throw loi('LINK', 'Link phải bắt đầu bằng https:// · 链接须以https://开头'); x.url = s(p.url); }
  x.dichTay = Object.keys(dichTay).length ? JSON.stringify(dichTay) : '';
  x.capNhat = thoiGianStr();
  suaDong('TaiLieu', x._r, thanhDong('TaiLieu', x));
  var sau = sachTL(x);
  ghiNhatKy('sua', 'TaiLieu', x.id, truoc, sau);
  return { taiLieu: sau };
}
function datHienHanh(p) {
  var x = timTL(p.id), bay = thoiGianStr();
  docBang('TaiLieu').forEach(function (t) {
    if (t.xoa || t.maTL !== x.maTL) return;
    var nen = t.id === x.id ? 1 : 0;
    if (t.hienHanh !== nen) { t.hienHanh = nen; t.capNhat = bay; suaDong('TaiLieu', t._r, thanhDong('TaiLieu', t)); }
  });
  ghiNhatKy('hienHanh', 'TaiLieu', x.id, null, { maTL: x.maTL, phienBan: x.phienBan });
  return { taiLieu: docBang('TaiLieu').filter(function (t) { return !t.xoa && t.maTL === x.maTL; }).map(sachTL) };
}
// Xoá bản đang hiệu lực thì bản mới nhất còn lại tự lên hiệu lực — tài liệu không bao giờ mất bản hiện hành
function xoaTL(p) {
  var x = timTL(p.id), truoc = sachTL(x), bay = thoiGianStr();
  x.xoa = 1; var laHH = !!x.hienHanh; x.hienHanh = 0; x.capNhat = bay;
  suaDong('TaiLieu', x._r, thanhDong('TaiLieu', x));
  if (laHH) {
    var con = docBang('TaiLieu').filter(function (t) { return !t.xoa && t.maTL === x.maTL; })
      .sort(function (a, b) { return b.phienBan - a.phienBan; });
    if (con.length) { con[0].hienHanh = 1; con[0].capNhat = bay; suaDong('TaiLieu', con[0]._r, thanhDong('TaiLieu', con[0])); }
  }
  ghiNhatKy('xoa', 'TaiLieu', x.id, truoc, null);
  return { id: x.id, taiLieu: docBang('TaiLieu').filter(function (t) { return !t.xoa && t.maTL === x.maTL; }).map(sachTL) };
}
function layTep(p) {
  var x = timTL(p.id);
  if (x.kieu !== 'FILE') throw loi('KHONG_TEP', 'Tài liệu này là link, mở bằng link · 此文件为链接');
  var b = DriveApp.getFileById(x.fileId).getBlob();
  return { id: x.id, mime: x.mime || b.getContentType(), tenTep: x.tenTep, b64: Utilities.base64Encode(b.getBytes()) };
}

// ===================== Bảng tra dây =====================
function sachDay(x) { var o = congKhai(x); o.dichTay = docJson(x.dichTay, {}); return o; }
function truongDay(p, x) {
  x.soDay = catChu(p.soDay, 40); x.banVe = catChu(p.banVe, 40); x.to = catChu(p.to, 20);
  x.tuDiem = catChu(p.tuDiem, 80); x.denDiem = catChu(p.denDiem, 80); x.mau = catChu(p.mau, 40);
  x.tinHieu = catChu(p.tinHieu, 200); x.ghiChu = catNhieuDong(p.ghiChu, 1000);
  x.taiLieuId = s(p.taiLieuId); x.trang = Math.max(0, Math.round(soHuu(p.trang, 0)));
  if (!x.soDay) throw loi('TRONG', 'Nhập số dây · 请输入线号');
  if (x.taiLieuId) timTL(x.taiLieuId);
}
function khoaDay(x) { return [x.soDay, x.banVe, x.to].join('|').toUpperCase(); }
function luuDay(p, op) {
  var ds = docBang('DayDien');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, day: sachDay(t) }; }
  var cu = s(p.id) ? ds.filter(function (x) { return x.id === s(p.id) && !x.xoa; })[0] : null;
  if (s(p.id) && !cu) throw loi('KHONG_THAY', 'Không thấy dây · 找不到电线');
  var truoc = cu ? sachDay(cu) : null;
  var x = cu || { id: op ? maTuOp('DD', op) : idMoi('DD', dsIdCo(ds)) };
  truongDay(p, x);
  var trung = ds.filter(function (d) { return !d.xoa && d.id !== x.id && khoaDay(d) === khoaDay(x); })[0];
  if (trung) throw loi('TRUNG', 'Đã có dây ' + x.soDay + ' trên tờ này · 该图纸已有此线号');
  var dichTay = cu ? docJson(cu.dichTay, {}) : {};
  apDich(x, truoc, p, 'tinHieu', 'tinHieuZh', dichTay);
  x.dichTay = Object.keys(dichTay).length ? JSON.stringify(dichTay) : '';
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || ''; x.xoa = 0;
  if (cu) suaDong('DayDien', cu._r, thanhDong('DayDien', x)); else themNhieu('DayDien', [thanhDong('DayDien', x)]);
  var sau = sachDay(x);
  ghiNhatKy(cu ? 'sua' : 'tao', 'DayDien', x.id, truoc, sau);
  return { day: sau };
}
// Nhập nhiều dòng từ Excel: trùng (số dây + bản vẽ + tờ) thì cập nhật, không thì thêm. Dòng lỗi báo lại, không dừng cả lượt.
function nhapDay(p, op) {
  var ds = docBang('DayDien'), rows = Array.isArray(p.rows) ? p.rows.slice(0, 3000) : [];
  if (op && ds.some(function (x) { return x.opId === op; })) return { dup: true, them: 0, sua: 0, loi: [] };
  if (!rows.length) throw loi('TRONG', 'File không có dòng dữ liệu · 文件没有数据');
  var theoKhoa = {}, daCo = dsIdCo(ds), them = [], sua = 0, loiDong = [], bay = thoiGianStr(), dichSo = 0;
  ds.forEach(function (d) { if (!d.xoa) theoKhoa[khoaDay(d)] = d; });
  rows.forEach(function (r, i) {
    var x = {};
    try { truongDay(r, x); } catch (e) { loiDong.push({ dong: i + 2, loi: e.message }); return; }
    var cu = theoKhoa[khoaDay(x)];
    // Dịch tối đa 150 dòng mỗi lượt: Apps Script giới hạn 6 phút/lần chạy. Dòng còn lại dịch khi sửa.
    var zh = s(r.tinHieuZh) || (cu && cu.tinHieu === x.tinHieu ? cu.tinHieuZh : (dichSo++ < 150 ? dichChu(x.tinHieu) : ''));
    x.tinHieuZh = zh; x.capNhat = bay; x.xoa = 0;
    if (cu) {
      x.id = cu.id; x.opId = cu.opId; x.dichTay = s(r.tinHieuZh) ? JSON.stringify({ tinHieu: 1 }) : cu.dichTay;
      suaDong('DayDien', cu._r, thanhDong('DayDien', x)); sua++;
    } else {
      x.id = idMoi('DD', daCo); x.opId = them.length ? '' : (op || ''); x.dichTay = s(r.tinHieuZh) ? JSON.stringify({ tinHieu: 1 }) : '';
      them.push(thanhDong('DayDien', x)); theoKhoa[khoaDay(x)] = x;
    }
  });
  themNhieu('DayDien', them);
  ghiNhatKy('nhap', 'DayDien', '', null, { them: them.length, sua: sua, loi: loiDong.length, tenTep: catChu(p.tenTep, 200) });
  return { them: them.length, sua: sua, loi: loiDong.slice(0, 50), dayDien: docBang('DayDien').filter(function (x) { return !x.xoa; }).map(sachDay) };
}
function xoaDay(p) {
  var x = docBang('DayDien').filter(function (d) { return d.id === s(p.id); })[0];
  if (!x) throw loi('KHONG_THAY', 'Không thấy dây · 找不到电线');
  if (x.xoa) return { id: x.id, dup: true };
  var truoc = sachDay(x);
  x.xoa = 1; x.capNhat = thoiGianStr();
  suaDong('DayDien', x._r, thanhDong('DayDien', x));
  ghiNhatKy('xoa', 'DayDien', x.id, truoc, null);
  return { id: x.id };
}

// ===================== Cấu hình tính toán =====================
function taoCauHinhMau() {
  var x = {}; Object.keys(CAU_HINH_MAU).forEach(function (k) { x[k] = CAU_HINH_MAU[k]; });
  x.id = 'CH01'; x.capNhat = thoiGianStr(); x.opId = ''; x.xoa = 0;
  themNhieu('CauHinhMay', [thanhDong('CauHinhMay', x)]);
  return docBang('CauHinhMay')[0];
}
function luuCauHinh(p, op) {
  var ds = docBang('CauHinhMay');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, cauHinh: congKhai(t) }; }
  var cu = s(p.id) ? ds.filter(function (x) { return x.id === s(p.id) && !x.xoa; })[0] : null;
  if (s(p.id) && !cu) throw loi('KHONG_THAY', 'Không thấy bộ thông số · 找不到参数组');
  var ten = catChu(p.ten, 120);
  if (!ten) throw loi('TRONG', 'Nhập tên bộ thông số · 请输入名称');
  var x = cu || { id: op ? maTuOp('CH', op) : idMoi('CH', dsIdCo(ds)) }, truoc = cu ? congKhai(cu) : null;
  x.ten = ten;
  // Chặn số vô lý ở máy chủ (không chỉ ở app): chia cho 0 hay số âm làm ra DPI/delay sai mà nhìn vẫn như thật
  [['encoderPPR', 1, 1e6], ['duongKinh', 1, 5000], ['soCanh', 1, 4], ['divider', 1, 1000], ['daiSP', 1, 10000], ['tocDo', 0, 100000],
    ['khoangJA', 0, 1000], ['khoangPB', 0, 5000], ['buPB', -1000, 1000], ['gioiHan', 0.1, 100]].forEach(function (k) {
    var v = Number(p[k[0]]);
    if (!isFinite(v) || v < k[1] || v > k[2]) throw loi('SO', 'Giá trị không hợp lệ: ' + k[0] + ' · 数值无效');
    x[k[0]] = v;
  });
  if ([1, 2, 4].indexOf(x.soCanh) < 0) throw loi('SO', 'Số cạnh giải mã chỉ là 1, 2 hoặc 4 · 解码边沿只能为1、2或4');
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || ''; x.xoa = 0;
  if (cu) suaDong('CauHinhMay', cu._r, thanhDong('CauHinhMay', x)); else themNhieu('CauHinhMay', [thanhDong('CauHinhMay', x)]);
  ghiNhatKy(cu ? 'sua' : 'tao', 'CauHinhMay', x.id, truoc, x);
  return { cauHinh: congKhai(x) };
}
function xoaCauHinh(p) {
  var ds = docBang('CauHinhMay'), x = ds.filter(function (c) { return c.id === s(p.id) && !c.xoa; })[0];
  if (!x) throw loi('KHONG_THAY', 'Không thấy bộ thông số · 找不到参数组');
  if (ds.filter(function (c) { return !c.xoa; }).length < 2) throw loi('CON_MOT', 'Phải giữ ít nhất một bộ thông số · 至少保留一组参数');
  var truoc = congKhai(x);
  x.xoa = 1; x.capNhat = thoiGianStr();
  suaDong('CauHinhMay', x._r, thanhDong('CauHinhMay', x));
  ghiNhatKy('xoa', 'CauHinhMay', x.id, truoc, null);
  return { id: x.id };
}

// ===================== Chuyền sản xuất =====================
function sachChuyen(x) {
  return { id: x.id, ma: x.ma, soMau: x.soMau, ghiChu: x.ghiChu, thuTu: x.thuTu, seriDau: x.seriDau, thayDau: x.thayDau, thayLoc: x.thayLoc,
    mauPB1: x.mauPB1, mauPB2: x.mauPB2 };
}
function taoChuyenMau() {
  var bay = thoiGianStr();
  themNhieu('Chuyen', CHUYEN_MAU.map(function (c, i) {
    return thanhDong('Chuyen', { id: 'CV' + c[0], ma: c[0], soMau: c[1], ghiChu: '', thuTu: i + 1, hoatDong: 1, capNhat: bay, opId: '',
      seriDau: '', thayDau: '', thayLoc: '', mauPB1: c[1] === 2 ? 'Xanh · 蓝' : '', mauPB2: c[1] === 2 ? 'Tím · 紫' : '' });
  }));
  return docBang('Chuyen');
}
function timChuyen(id) {
  var cv = docBang('Chuyen').filter(function (c) { return c.id === s(id) && c.hoatDong; })[0];
  if (!cv) throw loi('KHONG_THAY', 'Không thấy chuyền · 找不到产线');
  return cv;
}
function luuChuyen(p, op) {
  var ds = docBang('Chuyen');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, chuyen: sachChuyen(t) }; }
  var ma = catChu(p.ma, 20);
  if (!ma) throw loi('TRONG', 'Nhập mã chuyền · 请输入产线编号');
  var cu = s(p.id) ? ds.filter(function (x) { return x.id === s(p.id); })[0] : null;
  if (s(p.id) && !cu) throw loi('KHONG_THAY', 'Không thấy chuyền · 找不到产线');
  var soMau = Number(p.soMau);
  if (soMau !== 1 && soMau !== 2) throw loi('SO', 'Số màu chỉ là 1 hoặc 2 · 颜色数只能为1或2');
  var trung = ds.filter(function (x) { return x.hoatDong && x.ma.toLowerCase() === ma.toLowerCase() && (!cu || x.id !== cu.id); })[0];
  if (trung) throw loi('TRUNG', 'Đã có chuyền ' + ma + ' · 产线已存在');
  var truoc = cu ? congKhai(cu) : null;
  var x = cu || { id: op ? maTuOp('CV', op) : idMoi('CV', dsIdCo(ds)), thuTu: ds.length + 1 };
  x.ma = ma; x.soMau = soMau; x.ghiChu = catChu(p.ghiChu, 200);
  x.seriDau = catChu(p.seriDau, 60); x.thayDau = ngayTS(p.thayDau, 'Ngày thay đầu in'); x.thayLoc = ngayTS(p.thayLoc, 'Ngày thay lọc');
  x.mauPB1 = catChu(p.mauPB1, 40); x.mauPB2 = soMau === 2 ? catChu(p.mauPB2, 40) : '';
  x.hoatDong = p.hoatDong === undefined ? 1 : (hd(p.hoatDong) ? 1 : 0);
  if (p.thuTu !== undefined) x.thuTu = soHuu(p.thuTu, x.thuTu);
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || '';
  if (cu) suaDong('Chuyen', cu._r, thanhDong('Chuyen', x)); else themNhieu('Chuyen', [thanhDong('Chuyen', x)]);
  // Nhật ký giữ lịch sử seri đầu in / ngày thay đầu in, thay lọc
  ghiNhatKy(cu ? 'sua' : 'tao', 'Chuyen', x.id, truoc, x);
  return { chuyen: sachChuyen(x) };
}

// ===================== Sản phẩm =====================
function sachSP(x) { var o = congKhai(x); o.dichTay = docJson(x.dichTay, {}); return o; }
function luuSanPham(p, op) {
  var ds = docBang('SanPham');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, sanPham: sachSP(t) }; }
  var cu = s(p.id) ? ds.filter(function (x) { return x.id === s(p.id); })[0] : null;
  if (s(p.id) && !cu) throw loi('KHONG_THAY', 'Không thấy sản phẩm · 找不到产品');
  var ma = catChu(p.ma, 40), ten = catChu(p.ten, 120);
  if (!ma || !ten) throw loi('TRONG', 'Nhập mã và tên sản phẩm · 请输入产品编号和名称');
  var trung = ds.filter(function (x) { return x.hoatDong && x.ma.toLowerCase() === ma.toLowerCase() && (!cu || x.id !== cu.id); })[0];
  if (trung) throw loi('TRUNG', 'Đã có sản phẩm mã ' + ma + ' · 产品编号已存在');
  var truoc = cu ? sachSP(cu) : null, dichTay = cu ? docJson(cu.dichTay, {}) : {};
  var x = cu || { id: op ? maTuOp('SP', op) : idMoi('SP', dsIdCo(ds)) };
  x.ma = ma; x.ten = ten; x.daiSP = soTS(p.daiSP, ['daiSP', 1, 10000, 'Chiều dài SP (mm) · 单片长度']); x.ghiChu = catChu(p.ghiChu, 300);
  apDich(x, truoc, p, 'ten', 'tenDich', dichTay);
  x.dichTay = Object.keys(dichTay).length ? JSON.stringify(dichTay) : '';
  x.hoatDong = p.hoatDong === undefined ? 1 : (hd(p.hoatDong) ? 1 : 0);
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || '';
  if (cu) suaDong('SanPham', cu._r, thanhDong('SanPham', x)); else themNhieu('SanPham', [thanhDong('SanPham', x)]);
  var sau = sachSP(x);
  ghiNhatKy(cu ? 'sua' : 'tao', 'SanPham', x.id, truoc, sau);
  return { sanPham: sau };
}
function timSP(id) {
  var sp = docBang('SanPham').filter(function (x) { return x.id === s(id) && x.hoatDong; })[0];
  if (!sp) throw loi('KHONG_THAY', 'Không thấy sản phẩm · 找不到产品');
  return sp;
}
// Gắn sản phẩm vào chuyền (hoặc gỡ ra với hoatDong = 0). Gắn lại cùng cặp thì dùng lại dòng cũ, không tạo trùng.
function ganSP(cv, sp, bat, op) {
  var ds = docBang('ChuyenSP'), cu = ds.filter(function (x) { return x.chuyen === cv && x.sanPham === sp; })[0];
  if (cu && (cu.hoatDong ? 1 : 0) === (bat ? 1 : 0)) return cu;
  var x = cu || { id: op ? maTuOp('CS', op) : idMoi('CS', dsIdCo(ds)), chuyen: cv, sanPham: sp };
  x.hoatDong = bat ? 1 : 0; x.capNhat = thoiGianStr(); x.opId = op || x.opId || '';
  if (cu) suaDong('ChuyenSP', cu._r, thanhDong('ChuyenSP', x)); else themNhieu('ChuyenSP', [thanhDong('ChuyenSP', x)]);
  ghiNhatKy(bat ? 'gan' : 'go', 'ChuyenSP', x.id, cu ? congKhai(cu) : null, x);
  return x;
}
function spDangChay(cv) {
  var ds = docBang('ChaySP').filter(function (x) { return !x.xoa && x.chuyen === cv; })
    .sort(function (a, b) { return (a.tuNgay + a.lucTao + a.id) < (b.tuNgay + b.lucTao + b.id) ? -1 : 1; });
  return ds.length ? ds[ds.length - 1].sanPham : '';
}
function ganSanPham(p, op) {
  var cv = timChuyen(p.chuyen), sp = timSP(p.sanPham), bat = p.hoatDong === undefined ? true : hd(p.hoatDong);
  if (!bat && spDangChay(cv.id) === sp.id) throw loi('DANG_CHAY', 'Sản phẩm đang chạy, chuyển chuyền sang sản phẩm khác trước · 产品正在运行');
  var x = ganSP(cv.id, sp.id, bat, op);
  return { chuyenSP: { id: x.id, chuyen: x.chuyen, sanPham: x.sanPham, hoatDong: x.hoatDong } };
}
function chuyenSanPham(p, op) {
  var ds = docBang('ChaySP');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, chaySP: congKhai(t) }; }
  var cv = timChuyen(p.chuyen), sp = timSP(p.sanPham), tu = ngayTS(p.tuNgay, 'Từ ngày');
  if (!tu) throw loi('TRONG', 'Nhập ngày bắt đầu chạy · 请输入开始日期');
  ganSP(cv.id, sp.id, true, '');
  var x = { id: op ? maTuOp('CY', op) : idMoi('CY', dsIdCo(ds)), chuyen: cv.id, sanPham: sp.id, tuNgay: tu, lucTao: thoiGianStr(), opId: op || '', xoa: 0 };
  themNhieu('ChaySP', [thanhDong('ChaySP', x)]);
  ghiNhatKy('chay', 'ChaySP', x.id, null, x);
  return { chaySP: congKhai(x) };
}

// ===================== Thông số theo chuyền + sản phẩm (có lịch sử) =====================
function sachTS(x) { var o = congKhai(x); o.dichTay = docJson(x.dichTay, {}); return o; }
// Ô trống giữ trống ("chưa ghi"); có chữ thì phải là số trong khoảng. Nhận cả dấu phẩy thập phân "5,02".
function soTS(v, k) {
  var t = s(v).replace(',', '.');
  if (!t) return '';
  var n = Number(t);
  if (!isFinite(n) || n < k[1] || n > k[2]) throw loi('SO', 'Giá trị không hợp lệ: ' + k[3] + ' (' + k[1] + '–' + k[2] + ')');
  return String(n);
}
function ngayTS(v, ten) {
  var t = s(v);
  if (!t) return '';
  var d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + 'T00:00:00Z') : null;
  // So ngược lại để chặn ngày không có thật như 2026-02-31
  if (!d || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) throw loi('NGAY', 'Ngày không hợp lệ: ' + ten + ' · 日期无效');
  return t;
}
// Dãy theo JA (Head Alignments, Fire Pulses): tối đa 4 số với máy 1 màu, 8 số với máy 2 màu; nhận / , ; hoặc dấu cách.
function dayTS(v, toiDa, nguyen, k) {
  var t = s(v);
  if (!t) return '';
  var a = t.split(/[\/,;\s]+/).filter(function (x) { return x !== ''; });
  if (a.length > toiDa) throw loi('SO', k[3] + ': tối đa ' + toiDa + ' giá trị (JA1–' + toiDa + ') · 最多' + toiDa + '个值');
  return a.map(function (x) {
    var n = Number(String(x).replace(',', '.'));
    if (!isFinite(n) || n < k[1] || n > k[2] || (nguyen && Math.round(n) !== n)) throw loi('SO', 'Giá trị không hợp lệ: ' + k[3] + ' "' + x + '"');
    return String(n);
  }).join('/');
}
function chonTS(v, k) {
  var t = s(v);
  if (!t) return '';
  if (TS_CHON[k].indexOf(t) < 0) throw loi('SO', 'Giá trị không hợp lệ: ' + k + ' "' + t + '"');
  return t;
}
function luuThongSo(p, op) {
  var ds = docBang('ThongSo');
  if (op) { var t = ds.filter(function (x) { return x.opId === op; })[0]; if (t) return { dup: true, thongSo: sachTS(t) }; }
  var cv = timChuyen(p.chuyen), sp = timSP(p.sanPham), nJA = cv.soMau * 4;
  var apDung = ngayTS(p.apDung, 'Ngày áp dụng');
  if (!apDung) throw loi('TRONG', 'Nhập ngày áp dụng · 请输入生效日期');
  var x = { id: op ? maTuOp('TS', op) : idMoi('TS', dsIdCo(ds)), chuyen: cv.id, sanPham: sp.id, soMau: cv.soMau, apDung: apDung,
    ghiChu: catNhieuDong(p.ghiChu, 1000) };
  Object.keys(TS_CHON).forEach(function (k) { x[k] = chonTS(p[k], k); });
  TS_SO.forEach(function (k) { x[k[0]] = soTS(p[k[0]], k); });
  x.align = dayTS(p.align, nJA, true, ['align', 0, 1000000, 'Head Alignments (pixel)']);
  x.volt = dayTS(p.volt, nJA, false, ['volt', 0, 300, 'Fire Pulses (VDC)']);
  [1, 2].forEach(function (m) {
    // Máy 1 màu không có PB2: bỏ hẳn cột …2 kể cả khi app gửi lên (chép từ máy 2 màu sang)
    var co = m <= cv.soMau;
    TS_SO_PB.forEach(function (k) { x[k[0] + m] = co ? soTS(p[k[0] + m], k) : ''; });
    x['muc' + m] = co ? catChu(p['muc' + m], 80) : '';
  });
  var dichTay = {};
  apDich(x, null, p, 'ghiChu', 'ghiChuDich', dichTay);
  x.dichTay = Object.keys(dichTay).length ? JSON.stringify(dichTay) : '';
  x.lucTao = thoiGianStr(); x.opId = op || ''; x.xoa = 0;
  ganSP(cv.id, sp.id, true, '');
  themNhieu('ThongSo', [thanhDong('ThongSo', x)]);
  var sau = sachTS(x);
  ghiNhatKy('tao', 'ThongSo', x.id, null, sau);
  return { thongSo: sau };
}
// Xoá một lần ghi nhầm: chỉ đánh dấu Xoa = 1; lần ghi trước đó tự thành thông số hiện tại
function xoaThongSo(p) {
  var ds = docBang('ThongSo'), x = ds.filter(function (t) { return t.id === s(p.id); })[0];
  if (!x) throw loi('KHONG_THAY', 'Không thấy lần ghi thông số · 找不到参数记录');
  if (x.xoa) return { id: x.id, dup: true };
  var truoc = sachTS(x);
  x.xoa = 1;
  suaDong('ThongSo', x._r, thanhDong('ThongSo', x));
  ghiNhatKy('xoa', 'ThongSo', x.id, truoc, null);
  return { id: x.id };
}

// ===================== Bảng chương trình PLC theo chuyền =====================
var NHOM_PLC = ['Chương trình PLC', 'PLC程序'];
// Nhóm tài liệu riêng cho bảng chương trình; bản cũ chưa có thì tạo thêm (không đụng nhóm người dùng đã đặt)
function nhomPLC() {
  var ds = docBang('NhomTL'), x = ds.filter(function (n) { return n.ten === NHOM_PLC[0]; })[0];
  if (x) {
    if (!x.hoatDong) { x.hoatDong = 1; x.capNhat = thoiGianStr(); suaDong('NhomTL', x._r, thanhDong('NhomTL', x)); }
    return x.id;
  }
  var id = idMoi('NH', dsIdCo(ds));
  themNhieu('NhomTL', [thanhDong('NhomTL', { id: id, ten: NHOM_PLC[0], tenZh: NHOM_PLC[1], thuTu: ds.length + 1, hoatDong: 1, capNhat: thoiGianStr(), opId: '' })]);
  return id;
}
function taiBangMay(p, op) {
  var ds = docBang('BangMay');
  if (op) {
    var t = ds.filter(function (x) { return x.opId === op; })[0];
    if (t) return { dup: true, bangMay: congKhai(t) };
  }
  var cv = timChuyen(p.chuyen);
  var cu = ds.filter(function (x) { return !x.xoa && x.chuyen === cv.id; })[0];
  // Tải lại cho chuyền đã có bảng → phiên bản mới của cùng tài liệu (bản cũ vẫn xem lại được ở mục Tài liệu)
  var tl = taiLenTL({ maTL: cu ? cu.maTL : '', ten: 'Bảng chương trình ' + cv.ma, tenDich: cv.ma + '号线PLC程序表', nhom: nhomPLC(),
    tenTep: p.tenTep, mime: p.mime, b64: p.b64, the: ['PLC', cv.ma] }, op).taiLieu;
  var x = cu || { id: op ? maTuOp('BM', op) : idMoi('BM', dsIdCo(ds)), chuyen: cv.id, maTL: tl.maTL };
  x.capNhat = thoiGianStr(); x.opId = op || x.opId || ''; x.xoa = 0;
  if (cu) suaDong('BangMay', cu._r, thanhDong('BangMay', x)); else themNhieu('BangMay', [thanhDong('BangMay', x)]);
  ghiNhatKy(cu ? 'sua' : 'tao', 'BangMay', x.id, cu ? congKhai(cu) : null, x);
  return { bangMay: congKhai(x), taiLieu: tl };
}
function xoaBangMay(p) {
  var ds = docBang('BangMay'), x = ds.filter(function (b) { return b.id === s(p.id); })[0];
  if (!x) throw loi('KHONG_THAY', 'Không thấy bảng chương trình · 找不到程序表');
  if (x.xoa) return { id: x.id, dup: true };
  var truoc = congKhai(x);
  x.xoa = 1; x.capNhat = thoiGianStr();
  suaDong('BangMay', x._r, thanhDong('BangMay', x));
  ghiNhatKy('xoa', 'BangMay', x.id, truoc, null);
  return { id: x.id };
}
// Dịch một dòng khi người dùng bấm (bảng chương trình hàng chục nghìn dòng, dịch sẵn hết sẽ vượt hạn mức Google Dịch).
// Chữ Trung → tiếng Việt, chữ Việt → tiếng Trung (dichChu tự nhận ra).
function dichMotDong(p) {
  var t = catNhieuDong(p.text, 2000);
  if (!t) throw loi('TRONG', 'Không có chữ để dịch · 没有可翻译的内容');
  var d = dichChu(t);
  if (!d) throw loi('DICH', 'Google Dịch đang lỗi hoặc hết hạn mức hôm nay, thử lại sau · 翻译暂不可用');
  return { dich: d };
}

// ===================== Cài đặt =====================
// Chạy tay một lần sau khi dán mã. Chạy lại không tạo trùng.
function caiDatBanDau() {
  Object.keys(BANG).forEach(trang);
  if (!docBang('NguoiDung').length) {
    themNhieu('NguoiDung', [thanhDong('NguoiDung', { id: 'U001', ten: 'Chủ app', pinHash: bamPin('111111'), hoatDong: 1, ngayTao: thoiGianStr() })]);
  }
  if (!docBang('NhomTL').length) taoNhomMau();
  if (!docBang('CauHinhMay').length) taoCauHinhMau();
  if (!docBang('Chuyen').length) taoChuyenMau();
  return 'Đã cài đặt. PIN mặc định 111111 — đổi ngay trong app.';
}
// Thử Google Dịch (chạy tay trong Apps Script để cấp quyền dịch)
function thuDich() { return [dichChu('Kiểm tra áp suất meniscus'), dichChu('更换墨水过滤器')]; }
