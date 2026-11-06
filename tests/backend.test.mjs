// Kiểm thử máy chủ (Code.gs) — chạy: npm test
// Code.gs chạy trong sandbox vm với bộ giả lập Apps Script (src/demo/gas-shim.js), giống hệt bản xem thử.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBackend } from './harness.mjs';
import { readFileSync } from 'node:fs';

const CFG = JSON.parse(readFileSync(new URL('../src/config.json', import.meta.url), 'utf8'));
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data; };
const err = (r, code) => { assert.equal(r.ok, false, 'phải lỗi ' + code + ': ' + JSON.stringify(r)); assert.equal(r.code, code, JSON.stringify(r)); return r; };
const setup = (seed) => { const b = loadBackend({ seed: seed || 'empty' }); return Object.assign(b, { tk: b.login('111111') }); };
const rawRows = (b, ten) => { const sh = b.ctx.SpreadsheetApp.getActive().getSheetByName(ten); return sh.data.slice(1).filter((r) => r && r[0]); };
const b64 = (s) => Buffer.from(s).toString('base64');

test('phiên bản trong Code.gs khớp config.json và package.json', () => {
  const b = loadBackend();
  assert.equal(ok(b.call('ping')).phienBan, CFG.version);
  assert.equal(PKG.version, CFG.version);
});

test('đăng nhập bằng PIN; sai PIN báo lỗi, sai 5 lần thì khoá', () => {
  const b = loadBackend();
  const d = ok(b.call('login', { pin: '111111' }));
  assert.ok(d.token); assert.equal(d.macDinh, true, 'PIN mặc định phải nhắc đổi');
  err(b.call('login', { pin: '222222' }), 'PIN_SAI');
  err(b.call('login', { pin: 'abc' }), 'PIN_SAI');
  for (let i = 0; i < 4; i++) b.call('login', { pin: '000000' });
  err(b.call('login', { pin: '111111' }), 'KHOA');
});

test('mọi thao tác trừ ping/đăng nhập đều cần token hợp lệ', () => {
  const b = loadBackend();
  for (const a of ['data', 'noteSave', 'docGet', 'photo', 'wireImport', 'audit']) err(b.call(a, {}, 'gia.mao.token'), 'HET_PHIEN');
  err(b.call('data', {}, ''), 'HET_PHIEN');
  const tk = b.login();
  err(b.call('khongCo', {}, tk), 'KHONG_HIEU');
});

test('token hết hạn sau 30 ngày', () => {
  const b = setup();
  b.setNow('2026-11-25T03:00:00Z');
  err(b.call('data', {}, b.tk), 'HET_PHIEN');
});

test('đổi PIN: PIN mới đăng nhập được, phiên cũ tự hết hiệu lực, chặn PIN yếu', () => {
  const b = setup();
  err(b.call('changePin', { cu: '000000', moi: '135790' }, b.tk), 'PIN_SAI');
  err(b.call('changePin', { cu: '111111', moi: '12345' }, b.tk), 'PIN_6');
  err(b.call('changePin', { cu: '111111', moi: '111111' }, b.tk), 'PIN_YEU');
  for (const yeu of ['222222', '123456', '654321', '345678']) err(b.call('changePin', { cu: '111111', moi: yeu }, b.tk), 'PIN_YEU');
  const moi = ok(b.call('changePin', { cu: '111111', moi: '135790' }, b.tk)).token;
  err(b.call('data', {}, b.tk), 'HET_PHIEN');
  ok(b.call('data', {}, moi));
  err(b.call('login', { pin: '111111' }), 'PIN_SAI');
  assert.equal(ok(b.call('login', { pin: '135790' })).macDinh, false);
});

test('lần đầu tải dữ liệu: tự tạo các trang, 4 nhóm mẫu và bộ thông số máy in', () => {
  const b = setup();
  const d = ok(b.call('data', {}, b.tk));
  assert.equal(d.nhom.length, 4);
  assert.equal(d.nhom[0].tenZh, '设备手册');
  assert.equal(d.cauHinh.length, 1);
  assert.equal(d.cauHinh[0].divider, 6);
  for (const t of ['GhiChu', 'NhomTL', 'TaiLieu', 'DayDien', 'CauHinhMay', 'NhatKy', 'NguoiDung', 'Chuyen', 'SanPham', 'ChuyenSP', 'ChaySP', 'ThongSo']) assert.ok(b.ctx.SpreadsheetApp.getActive().getSheetByName(t), t);
});

test('nâng cấp: trang cũ thiếu cột cuối được thêm cột, dữ liệu cũ đọc đúng', () => {
  const b = setup();
  ok(b.call('data', {}, b.tk));
  const sh = b.ctx.SpreadsheetApp.getActive().getSheetByName('GhiChu');
  // Giả lập sheet bản cũ chưa có cột DichTay
  sh.data[0] = sh.data[0].slice(0, 12);
  sh.data[1] = ['GCCU0001', 'Ghi chú cũ', '', 'nội dung', '', '', '', '', '2026-01-01 08:00:00', '2026-01-01 08:00:00', '', 0];
  const d = ok(b.call('data', {}, b.tk));
  assert.equal(sh.data[0].length, 13);
  assert.equal(sh.data[0][12], 'DichTay');
  assert.equal(d.ghiChu[0].tieuDe, 'Ghi chú cũ');
  assert.deepEqual(d.ghiChu[0].dichTay, {});
});

test('ghi chú: tự dịch tiêu đề và nội dung sang tiếng Trung, thẻ không trùng', () => {
  const b = setup('demo');
  const x = ok(b.call('noteSave', { tieuDe: 'Thay lọc mực', noiDung: 'Kiểm tra áp suất meniscus', the: 'lọc, #Lọc, đầu in' }, b.tk, 'op-a1')).ghiChu;
  assert.equal(x.tieuDeDich, '更换墨水过滤器');
  assert.equal(x.noiDungDich, '检查弯月面压力');
  assert.deepEqual(x.the, ['lọc', 'đầu in']);
  assert.equal(x.id, 'GCOPA1');
  err(b.call('noteSave', { tieuDe: '', noiDung: '' }, b.tk), 'TRONG');
});

test('ghi chú: gửi lại cùng opId không tạo bản trùng (hàng chờ mất mạng gửi lại)', () => {
  const b = setup();
  const a = ok(b.call('noteSave', { tieuDe: 'Ghi chú thử', noiDung: 'x' }, b.tk, 'op-dup'));
  const c = ok(b.call('noteSave', { tieuDe: 'Ghi chú thử', noiDung: 'x' }, b.tk, 'op-dup'));
  assert.equal(c.dup, true);
  assert.equal(c.ghiChu.id, a.ghiChu.id);
  assert.equal(ok(b.call('data', {}, b.tk)).ghiChu.length, 1);
});

test('ghi chú: bản dịch sửa tay không bị dịch đè khi sửa chữ gốc; xoá bản dịch thì dịch lại', () => {
  const b = setup('demo');
  const x = ok(b.call('noteSave', { tieuDe: 'Ghi chú thử', noiDung: 'abc' }, b.tk)).ghiChu;
  assert.equal(x.tieuDeDich, '测试笔记');
  const tay = ok(b.call('noteSave', { id: x.id, tieuDe: 'Ghi chú thử', tieuDeDich: '我改的翻译', noiDung: 'abc' }, b.tk)).ghiChu;
  assert.equal(tay.tieuDeDich, '我改的翻译');
  assert.equal(tay.dichTay.tieuDe, 1);
  const sua = ok(b.call('noteSave', { id: x.id, tieuDe: 'Thay lọc mực', noiDung: 'abc' }, b.tk)).ghiChu;
  assert.equal(sua.tieuDeDich, '我改的翻译', 'đã sửa tay thì không dịch đè');
  const lai = ok(b.call('noteSave', { id: x.id, tieuDe: 'Thay lọc mực', tieuDeDich: '', noiDung: 'abc' }, b.tk)).ghiChu;
  assert.equal(lai.tieuDeDich, '更换墨水过滤器');
  assert.equal(lai.dichTay.tieuDe, undefined);
});

test('ghi chú: chữ bắt đầu bằng = + - @ được chèn dấu nháy trên sheet, app vẫn thấy đúng chữ gõ', () => {
  const b = setup();
  const x = ok(b.call('noteSave', { tieuDe: '=HYPERLINK("x")', noiDung: '-24V nối J53', the: ['+tag'] }, b.tk)).ghiChu;
  // Dòng gửi xuống sheet phải có dấu nháy đứng trước (Sheets coi là chữ, không chạy công thức)
  const dong = b.ctx.thanhDong('GhiChu', { tieuDe: '=HYPERLINK("x")', noiDung: '-24V', maMay: '@abc', the: '+1' });
  assert.equal(dong[1], '\'=HYPERLINK("x")');
  assert.equal(dong[3], "'-24V");
  assert.equal(dong[7], "'@abc");
  assert.equal(rawRows(b, 'GhiChu')[0][1], '=HYPERLINK("x")', 'ô lưu đúng chữ đã gõ');
  assert.equal(x.tieuDe, '=HYPERLINK("x")');
  assert.equal(ok(b.call('data', {}, b.tk)).ghiChu[0].noiDung, '-24V nối J53');
});

test('ghi chú: ảnh lưu Drive riêng tư, đọc qua máy chủ, xoá bớt ảnh được, không đọc được tệp lạ', () => {
  const b = setup();
  const x = ok(b.call('noteSave', { tieuDe: 'Có ảnh', anhMoi: [{ mime: 'image/jpeg', b64: b64('anh-1') }, { mime: 'image/png', b64: b64('anh-2') }] }, b.tk)).ghiChu;
  assert.equal(x.anh.length, 2);
  const f = b.ctx.DriveApp.getFileById(x.anh[0]);
  assert.equal(f.shared, false, 'ảnh không được chia sẻ công khai');
  const a = ok(b.call('photo', { id: x.anh[0] }, b.tk));
  assert.equal(Buffer.from(a.b64, 'base64').toString(), 'anh-1');
  const bot = ok(b.call('noteSave', { id: x.id, tieuDe: 'Có ảnh', anh: [x.anh[1]] }, b.tk)).ghiChu;
  assert.deepEqual(bot.anh, [x.anh[1]]);
  err(b.call('photo', { id: x.anh[0] }, b.tk), 'KHONG_THAY');
  err(b.call('noteSave', { tieuDe: 'Ảnh rỗng', anhMoi: [{ mime: 'image/jpeg', b64: '' }] }, b.tk), 'ANH_RONG');
});

test('ghi chú: xoá chỉ đánh dấu Xoa = 1, dòng vẫn còn trên sheet; sửa ghi chú đã xoá bị chặn', () => {
  const b = setup();
  const x = ok(b.call('noteSave', { tieuDe: 'Sẽ xoá' }, b.tk)).ghiChu;
  ok(b.call('noteDelete', { id: x.id }, b.tk));
  assert.equal(ok(b.call('noteDelete', { id: x.id }, b.tk)).dup, true);
  assert.equal(rawRows(b, 'GhiChu').length, 1);
  assert.equal(rawRows(b, 'GhiChu')[0][11], 1);
  assert.equal(ok(b.call('data', {}, b.tk)).ghiChu.length, 0);
  err(b.call('noteSave', { id: x.id, tieuDe: 'Sửa lại' }, b.tk), 'DA_XOA');
  err(b.call('noteDelete', { id: 'GCKHONGCO' }, b.tk), 'KHONG_THAY');
});

test('nhật ký sửa đổi ghi đủ trước/sau cho tạo, sửa, xoá', () => {
  const b = setup();
  const x = ok(b.call('noteSave', { tieuDe: 'Bản 1' }, b.tk)).ghiChu;
  ok(b.call('noteSave', { id: x.id, tieuDe: 'Bản 2' }, b.tk));
  ok(b.call('noteDelete', { id: x.id }, b.tk));
  const nk = ok(b.call('audit', { bang: 'GhiChu', khoa: x.id }, b.tk)).nhatKy;
  assert.deepEqual(nk.map((n) => n.hanhDong), ['xoa', 'sua', 'tao']);
  assert.match(nk[1].truoc, /Bản 1/);
  assert.match(nk[1].sau, /Bản 2/);
  assert.equal(nk[2].truoc, '');
});

test('nhóm tài liệu: thêm có tự dịch, chặn trùng tên, không ẩn được nhóm còn tài liệu', () => {
  const b = setup('demo');
  const n = ok(b.call('groupSave', { ten: 'Bảo trì' }, b.tk, 'op-g1')).nhom;
  assert.equal(n.tenZh, '维护');
  assert.equal(ok(b.call('groupSave', { ten: 'Bảo trì' }, b.tk, 'op-g1')).dup, true);
  err(b.call('groupSave', { ten: 'bảo trì' }, b.tk), 'TRUNG');
  err(b.call('groupSave', { id: 'NH02', ten: 'Bản vẽ điện', hoatDong: 0 }, b.tk), 'CON_TL');
  ok(b.call('groupSave', { id: n.id, ten: 'Bảo trì', hoatDong: 0 }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).nhom.some((x) => x.id === n.id));
});

test('tài liệu: tải tệp lên Drive riêng tư, tự dịch tên, chặn tệp rỗng, quá lớn, sai nhóm', () => {
  const b = setup('demo');
  const t = ok(b.call('docUpload', { ten: 'Quy trình thay lọc mẫu', nhom: 'NH03', tenTep: 'quy-trinh.pdf', mime: 'application/pdf', b64: b64('%PDF-1.4 test'), the: 'lọc' }, b.tk, 'op-u1')).taiLieu;
  assert.equal(t.tenDich, '换滤芯规程样本');
  assert.equal(t.kieu, 'FILE');
  assert.equal(t.phienBan, 1);
  assert.equal(t.hienHanh, true);
  assert.equal(b.ctx.DriveApp.getFileById(t.fileId).shared, false);
  assert.equal(Buffer.from(ok(b.call('docGet', { id: t.id }, b.tk)).b64, 'base64').toString(), '%PDF-1.4 test');
  assert.equal(ok(b.call('docUpload', { ten: 'x', nhom: 'NH03', b64: b64('y') }, b.tk, 'op-u1')).dup, true);
  err(b.call('docUpload', { ten: 'Rỗng', nhom: 'NH03', b64: '' }, b.tk), 'TEP_RONG');
  err(b.call('docUpload', { ten: 'Sai nhóm', nhom: 'NH99', b64: b64('a') }, b.tk), 'NHOM');
  const lon = Buffer.alloc(25 * 1024 * 1024 + 1).toString('base64');
  err(b.call('docUpload', { ten: 'Quá lớn', nhom: 'NH03', b64: lon }, b.tk), 'TEP_LON');
});

test('tài liệu: phiên bản mới thành bản hiệu lực; chọn lại bản cũ; xoá bản hiệu lực thì bản mới nhất còn lại lên thay', () => {
  const b = setup('demo');
  const v3 = ok(b.call('docUpload', { maTL: 'MTTEST01', ten: 'Sơ đồ đi dây mẫu', nhom: 'NH02', tenTep: 'v3.pdf', mime: 'application/pdf', b64: b64('v3') }, b.tk)).taiLieu;
  assert.equal(v3.phienBan, 3);
  let ds = ok(b.call('data', {}, b.tk)).taiLieu.filter((x) => x.maTL === 'MTTEST01');
  assert.deepEqual(ds.filter((x) => x.hienHanh).map((x) => x.id), [v3.id], 'chỉ một bản hiệu lực');
  ds = ok(b.call('docCurrent', { id: 'TLTEST01' }, b.tk)).taiLieu;
  assert.deepEqual(ds.filter((x) => x.hienHanh).map((x) => x.id), ['TLTEST01']);
  ds = ok(b.call('docDelete', { id: 'TLTEST01' }, b.tk)).taiLieu;
  assert.deepEqual(ds.filter((x) => x.hienHanh).map((x) => x.id), [v3.id]);
  assert.equal(rawRows(b, 'TaiLieu').filter((r) => r[0] === 'TLTEST01')[0][17], 1, 'không xoá dòng, chỉ đánh dấu Xoa');
  err(b.call('docGet', { id: 'TLTEST01' }, b.tk), 'KHONG_THAY');
  err(b.call('docUpload', { maTL: 'MTKHONGCO', ten: 'x', nhom: 'NH02', b64: b64('a') }, b.tk), 'KHONG_THAY');
});

test('tài liệu: link Drive, sửa tên/nhóm/thẻ, link sai báo lỗi, link không tải tệp được', () => {
  const b = setup('demo');
  err(b.call('docLink', { ten: 'Link sai', nhom: 'NH01', url: 'javascript:alert(1)' }, b.tk), 'LINK');
  const l = ok(b.call('docLink', { ten: 'Sổ tay đầu in mẫu', nhom: 'NH01', url: 'https://drive.google.com/file/d/TEST-2/view' }, b.tk)).taiLieu;
  assert.equal(l.kieu, 'LINK');
  err(b.call('docGet', { id: l.id }, b.tk), 'KHONG_TEP');
  const s = ok(b.call('docSave', { id: l.id, ten: 'Tên mới', tenDich: '新名称', nhom: 'NH04', the: ['a', 'b'] }, b.tk)).taiLieu;
  assert.equal(s.ten, 'Tên mới'); assert.equal(s.tenDich, '新名称'); assert.equal(s.nhom, 'NH04'); assert.deepEqual(s.the, ['a', 'b']);
  const s2 = ok(b.call('docSave', { id: l.id, ten: 'Tên khác nữa' }, b.tk)).taiLieu;
  assert.equal(s2.tenDich, '新名称', 'tên dịch sửa tay giữ nguyên');
  err(b.call('docSave', { id: l.id, nhom: 'NH99' }, b.tk), 'NHOM');
  err(b.call('docSave', { id: l.id, ten: '' }, b.tk), 'TRONG');
});

test('bảng dây: thêm có tự dịch tín hiệu, chặn trùng số dây trên cùng tờ, chặn tài liệu không tồn tại', () => {
  const b = setup('demo');
  const d = ok(b.call('wireSave', { soDay: 'TEST-201', banVe: 'TEST-BV01', to: '7', tuDiem: 'A1', denDiem: 'B2', mau: 'Đỏ', tinHieu: 'Mass chung', taiLieuId: 'TLTEST02', trang: 1 }, b.tk, 'op-w1')).day;
  assert.equal(d.tinHieuZh, '公共地线');
  assert.equal(ok(b.call('wireSave', { soDay: 'khác' }, b.tk, 'op-w1')).dup, true);
  err(b.call('wireSave', { soDay: 'test-201', banVe: 'TEST-BV01', to: '7' }, b.tk), 'TRUNG');
  ok(b.call('wireSave', { soDay: 'TEST-201', banVe: 'TEST-BV01', to: '8' }, b.tk));
  err(b.call('wireSave', { soDay: '' }, b.tk), 'TRONG');
  err(b.call('wireSave', { soDay: 'X1', taiLieuId: 'TLKHONGCO' }, b.tk), 'KHONG_THAY');
  const sua = ok(b.call('wireSave', { id: d.id, soDay: 'TEST-201', banVe: 'TEST-BV01', to: '7', tinHieu: 'Nối đất' }, b.tk)).day;
  assert.equal(sua.tinHieuZh, '接地');
  ok(b.call('wireDelete', { id: d.id }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).dayDien.some((x) => x.id === d.id));
});

test('bảng dây: nhập Excel cập nhật dòng trùng, thêm dòng mới, báo dòng lỗi mà không dừng cả lượt', () => {
  const b = setup('demo');
  const r = ok(b.call('wireImport', { tenTep: 'TEST-day.xlsx', rows: [
    { soDay: 'TEST-101', banVe: 'TEST-BV01', to: '5', tuDiem: 'PS2-L', denDiem: 'TB1-2', mau: 'Cam/Đen', tinHieu: 'Nguồn 24 VDC' },
    { soDay: 'TEST-301', banVe: 'TEST-BV01', to: '9', tuDiem: 'X1', denDiem: 'X2', tinHieu: 'Nối đất', tinHieuZh: '手改翻译' },
    { soDay: '', banVe: 'TEST-BV01' },
    { soDay: '=CMD()', banVe: 'TEST-BV01', to: '9' }
  ] }, b.tk, 'op-i1'));
  assert.equal(r.them, 2); assert.equal(r.sua, 1);
  assert.deepEqual(r.loi.map((x) => x.dong), [4]);
  const ds = r.dayDien;
  assert.equal(ds.find((x) => x.soDay === 'TEST-101').denDiem, 'TB1-2');
  const moi = ds.find((x) => x.soDay === 'TEST-301');
  assert.equal(moi.tinHieuZh, '手改翻译');
  assert.equal(moi.dichTay.tinHieu, 1);
  assert.ok(ds.some((x) => x.soDay === '=CMD()'), 'số dây dạng công thức vẫn lưu như chữ');
  assert.equal(b.ctx.thanhDong('DayDien', { soDay: '=CMD()' })[1], "'=CMD()");
  assert.equal(ok(b.call('wireImport', { rows: [{ soDay: 'Z' }] }, b.tk, 'op-i1')).dup, true);
  err(b.call('wireImport', { rows: [] }, b.tk), 'TRONG');
});

test('bộ thông số tính toán: lưu được, chặn số vô lý, không xoá bộ cuối cùng', () => {
  const b = setup();
  const c0 = ok(b.call('data', {}, b.tk)).cauHinh[0];
  const p = Object.assign({}, c0, { id: '', ten: 'Chạy 800', tocDo: 800 });
  const c = ok(b.call('cfgSave', p, b.tk, 'op-c1')).cauHinh;
  assert.equal(c.tocDo, 800);
  assert.equal(ok(b.call('cfgSave', p, b.tk, 'op-c1')).dup, true);
  err(b.call('cfgSave', Object.assign({}, p, { divider: 0 }), b.tk), 'SO');
  err(b.call('cfgSave', Object.assign({}, p, { soCanh: 3 }), b.tk), 'SO');
  err(b.call('cfgSave', Object.assign({}, p, { duongKinh: 'abc' }), b.tk), 'SO');
  err(b.call('cfgSave', Object.assign({}, p, { ten: '' }), b.tk), 'TRONG');
  ok(b.call('cfgDelete', { id: c.id }, b.tk));
  err(b.call('cfgDelete', { id: c0.id }, b.tk), 'CON_MOT');
});

// ===== v1.1.0: chuyền → sản phẩm → thông số (theo màn hình bộ điều khiển), có lịch sử =====
const TS1 = { apDung: '2026-11-03', encDir: 'Forward', encDecode: 'All Four Edges', encDPI: '112,3', divider: '6', triggerMode: 'Once per Image', fireMode: 'External',
  formDelay: '0.5', align: '0, 121 243/364', registration: '0', volt: '98/98/99/98', meniscus: '5,02', purgeShort: '1.5', purgeLong: '3.5', nhietTam: '125',
  nhietBinh1: '120', lois1: '50', muc1: 'TEST-MUC', tocDo: '900' };
const spMoi = (b, ma, op) => ok(b.call('productSave', { ma, ten: 'Băng 330 mm', daiSP: '330' }, b.tk, op)).sanPham;

test('chuyền: lần đầu tạo sẵn 9 chuyền (1 màu 01/09/21/16, 2 màu 23/06/08/27/18), mã giữ số 0 đầu, 2 màu có PB1 xanh/PB2 tím', () => {
  const b = setup();
  const d = ok(b.call('data', {}, b.tk));
  assert.deepEqual(d.chuyen.map((c) => c.ma), ['01', '09', '21', '16', '23', '06', '08', '27', '18']);
  assert.deepEqual(d.chuyen.map((c) => c.soMau), [1, 1, 1, 1, 2, 2, 2, 2, 2]);
  assert.match(d.chuyen[4].mauPB2, /Tím/);
  assert.deepEqual([d.sanPham, d.thongSo, d.chaySP, d.chuyenSP], [[], [], [], []]);
  ok(b.call('data', {}, b.tk));
  assert.equal(rawRows(b, 'Chuyen').length, 9, 'tải lại không tạo thêm chuyền');
});

test('chuyền: thêm, chặn trùng mã, số màu 1|2, ghi seri/ngày thay đầu in (nhật ký giữ bản cũ), ngừng dùng thì ẩn', () => {
  const b = setup();
  ok(b.call('data', {}, b.tk));
  const c = ok(b.call('lineSave', { ma: '30', soMau: 1, mauPB2: 'Tím' }, b.tk, 'op-l1')).chuyen;
  assert.equal(c.mauPB2, '', 'máy 1 màu không có PB2');
  assert.equal(ok(b.call('lineSave', { ma: '30', soMau: 2 }, b.tk, 'op-l1')).dup, true);
  err(b.call('lineSave', { ma: '01', soMau: 1 }, b.tk), 'TRUNG');
  err(b.call('lineSave', { ma: '31', soMau: 3 }, b.tk), 'SO');
  err(b.call('lineSave', { ma: '', soMau: 1 }, b.tk), 'TRONG');
  err(b.call('lineSave', { id: c.id, ma: '30', soMau: 1, thayDau: '2026-13-01' }, b.tk), 'NGAY');
  ok(b.call('lineSave', { id: c.id, ma: '30', soMau: 1, seriDau: 'TEST-SN-1', thayDau: '2026-10-01' }, b.tk));
  ok(b.call('lineSave', { id: c.id, ma: '30', soMau: 1, seriDau: 'TEST-SN-2', thayDau: '2026-11-01' }, b.tk));
  const nk = ok(b.call('audit', { bang: 'Chuyen', khoa: c.id }, b.tk)).nhatKy;
  assert.match(nk[0].truoc, /TEST-SN-1/); assert.match(nk[0].sau, /TEST-SN-2/);
  ok(b.call('lineSave', { id: c.id, ma: '30', soMau: 1, hoatDong: 0 }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).chuyen.some((x) => x.ma === '30'));
});

test('sản phẩm: mã + tên, tự dịch tên, chặn trùng mã, chiều dài phải là số; gửi lại cùng opId không trùng', () => {
  const b = setup('demo');
  const x = spMoi(b, 'TEST-SP09', 'op-s1');
  assert.equal(x.id, 'SPOPS1'); assert.equal(x.tenDich, '330毫米卫生巾'); assert.equal(x.daiSP, '330');
  assert.equal(ok(b.call('productSave', { ma: 'TEST-SP09', ten: 'x' }, b.tk, 'op-s1')).dup, true);
  err(b.call('productSave', { ma: 'test-sp09', ten: 'Khác' }, b.tk), 'TRUNG');
  err(b.call('productSave', { ma: 'TEST-SP10', ten: '' }, b.tk), 'TRONG');
  err(b.call('productSave', { ma: 'TEST-SP10', ten: 'A', daiSP: 'dài' }, b.tk), 'SO');
  const y = ok(b.call('productSave', { id: x.id, ma: 'TEST-SP09', ten: 'Băng 330 mm', tenDich: '夜用330（手改）', daiSP: '330' }, b.tk)).sanPham;
  assert.deepEqual(y.dichTay, { ten: 1 });
  assert.equal(ok(b.call('productSave', { id: x.id, ma: 'TEST-SP09', ten: 'Băng 290 mm', daiSP: '290' }, b.tk)).sanPham.tenDich, '夜用330（手改）', 'sửa tay thì không dịch đè');
});

test('gắn sản phẩm vào chuyền, chuyển sản phẩm đang chạy (có lịch sử), không gỡ được sản phẩm đang chạy', () => {
  const b = setup('demo');
  const x = spMoi(b, 'TEST-SP09');
  ok(b.call('lineProduct', { chuyen: 'CV16', sanPham: x.id }, b.tk));
  ok(b.call('lineProduct', { chuyen: 'CV16', sanPham: x.id }, b.tk));
  let d = ok(b.call('data', {}, b.tk));
  assert.equal(d.chuyenSP.filter((l) => l.chuyen === 'CV16').length, 1, 'gắn lại không tạo trùng');
  const r = ok(b.call('runSet', { chuyen: 'CV16', sanPham: x.id, tuNgay: '2026-11-03' }, b.tk, 'op-r1')).chaySP;
  assert.equal(ok(b.call('runSet', { chuyen: 'CV16', sanPham: x.id, tuNgay: '2026-11-03' }, b.tk, 'op-r1')).dup, true);
  assert.equal(r.sanPham, x.id);
  err(b.call('lineProduct', { chuyen: 'CV16', sanPham: x.id, hoatDong: 0 }, b.tk), 'DANG_CHAY');
  // Chuyển chuyền 23 sang SP07 (chưa từng chạy) rồi gỡ SP06 khỏi chuyền
  ok(b.call('runSet', { chuyen: 'CV23', sanPham: 'SPTEST07', tuNgay: '2026-11-04' }, b.tk));
  ok(b.call('lineProduct', { chuyen: 'CV23', sanPham: 'SPTEST06', hoatDong: 0 }, b.tk));
  d = ok(b.call('data', {}, b.tk));
  assert.ok(!d.chuyenSP.some((l) => l.chuyen === 'CV23' && l.sanPham === 'SPTEST06'));
  assert.equal(d.chaySP.filter((c) => c.chuyen === 'CV23').length, 3, 'lịch sử chạy giữ đủ');
  err(b.call('runSet', { chuyen: 'CV23', sanPham: 'SPKHONG', tuNgay: '2026-11-04' }, b.tk), 'KHONG_THAY');
  err(b.call('runSet', { chuyen: 'CV23', sanPham: 'SPTEST05', tuNgay: '' }, b.tk), 'TRONG');
});

test('thông số: mỗi lần lưu là một dòng mới theo chuyền + sản phẩm, chuẩn hoá số/dãy JA, tự dịch lý do, opId không trùng', () => {
  const b = setup('demo');
  const truoc = rawRows(b, 'ThongSo').length;
  const x = ok(b.call('paramSave', Object.assign({ chuyen: 'CV21', sanPham: 'SPTEST01', ghiChu: 'Thông số ban đầu' }, TS1), b.tk, 'op-t1')).thongSo;
  assert.equal(x.id, 'TSOPT1');
  assert.equal(x.meniscus, '5.02'); assert.equal(x.encDPI, '112.3');
  assert.equal(x.align, '0/121/243/364');
  assert.equal(x.ghiChuDich, '初始参数');
  assert.equal(x.lungVac, '', 'ô trống giữ trống, không thành 0');
  assert.equal(ok(b.call('paramSave', Object.assign({ chuyen: 'CV21', sanPham: 'SPTEST01' }, TS1), b.tk, 'op-t1')).dup, true);
  ok(b.call('paramSave', Object.assign({ chuyen: 'CV21', sanPham: 'SPTEST01' }, TS1, { volt: '100/100/100/100' }), b.tk, 'op-t2'));
  assert.equal(rawRows(b, 'ThongSo').length, truoc + 2, 'không sửa dòng cũ, chỉ thêm dòng');
  const ds = ok(b.call('data', {}, b.tk)).thongSo.filter((t) => t.chuyen === 'CV21' && t.sanPham === 'SPTEST01');
  assert.deepEqual(ds.map((t) => t.volt), ['98/98/99/98', '100/100/100/100']);
  // Cùng sản phẩm ở chuyền khác là bộ thông số khác; lưu thông số cho SP chưa gắn thì tự gắn vào chuyền
  ok(b.call('paramSave', Object.assign({ chuyen: 'CV16', sanPham: 'SPTEST01' }, TS1), b.tk));
  assert.ok(ok(b.call('data', {}, b.tk)).chuyenSP.some((l) => l.chuyen === 'CV16' && l.sanPham === 'SPTEST01'));
});

test('thông số: máy 1 màu chỉ JA1–4 và bỏ PB2; máy 2 màu đủ JA1–8 và 2 bình; bản dịch lý do sửa tay được giữ', () => {
  const b = setup('demo');
  err(b.call('paramSave', Object.assign({ chuyen: 'CV01', sanPham: 'SPTEST01' }, TS1, { align: '1/2/3/4/5' }), b.tk), 'SO');
  const m1 = ok(b.call('paramSave', Object.assign({ chuyen: 'CV01', sanPham: 'SPTEST01' }, TS1, { nhietBinh2: '130', muc2: 'TEST-TIM' }), b.tk)).thongSo;
  assert.equal(m1.nhietBinh2, ''); assert.equal(m1.muc2, ''); assert.equal(m1.soMau, 1);
  const m2 = ok(b.call('paramSave', Object.assign({ chuyen: 'CV23', sanPham: 'SPTEST05' }, TS1, { align: '0/121/243/364/520/641/763/884', volt: '98/98/99/98/104/103/104/103',
    nhietBinh2: '121', lois2: '50', muc2: 'TEST-TIM', ghiChu: 'PB2 in mờ, tăng áp', ghiChuDich: '手改' }), b.tk)).thongSo;
  assert.equal(m2.soMau, 2); assert.equal(m2.volt.split('/').length, 8); assert.equal(m2.nhietBinh2, '121'); assert.equal(m2.muc2, 'TEST-TIM');
  assert.equal(m2.ghiChuDich, '手改'); assert.deepEqual(m2.dichTay, { ghiChu: 1 });
  err(b.call('paramSave', Object.assign({ chuyen: 'CV23', sanPham: 'SPTEST05' }, TS1, { align: '1/2/3/4/5/6/7/8/9' }), b.tk), 'SO');
});

test('thông số: chặn số ngoài khoảng, lựa chọn lạ, ngày sai, chuyền/SP không có; chữ = + - @ được chèn nháy', () => {
  const b = setup('demo');
  const p = (o) => Object.assign({ chuyen: 'CV01', sanPham: 'SPTEST01' }, TS1, o);
  err(b.call('paramSave', p({ volt: '98/500' }), b.tk), 'SO');
  err(b.call('paramSave', p({ align: '12.5' }), b.tk), 'SO');
  err(b.call('paramSave', p({ meniscus: 'năm' }), b.tk), 'SO');
  err(b.call('paramSave', p({ divider: '0' }), b.tk), 'SO');
  err(b.call('paramSave', p({ purgeLong: '30' }), b.tk), 'SO');
  err(b.call('paramSave', p({ encDecode: 'Three Edges' }), b.tk), 'SO');
  err(b.call('paramSave', p({ apDung: '' }), b.tk), 'TRONG');
  err(b.call('paramSave', p({ apDung: '2026-02-31' }), b.tk), 'NGAY');
  err(b.call('paramSave', p({ chuyen: 'CVKHONG' }), b.tk), 'KHONG_THAY');
  err(b.call('paramSave', p({ sanPham: 'SPKHONG' }), b.tk), 'KHONG_THAY');
  const x = ok(b.call('paramSave', p({ muc1: '=TEST', ghiChu: '-5V' }), b.tk)).thongSo;
  assert.equal(x.muc1, '=TEST'); assert.equal(x.ghiChu, '-5V');
  const cot = b.ctx.BANG.ThongSo, dong = b.ctx.thanhDong('ThongSo', x);
  assert.equal(dong[cot.indexOf('Muc1')], "'=TEST");
  assert.equal(dong[cot.indexOf('GhiChu')], "'-5V");
});

test('thông số: xoá lần ghi nhầm chỉ đánh dấu Xoa = 1, có nhật ký; mọi thao tác mới đều cần đăng nhập', () => {
  const b = setup('demo');
  const x = ok(b.call('paramSave', Object.assign({ chuyen: 'CV01', sanPham: 'SPTEST01' }, TS1), b.tk)).thongSo;
  ok(b.call('paramDelete', { id: x.id }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).thongSo.some((t) => t.id === x.id));
  assert.ok(rawRows(b, 'ThongSo').some((r) => r[0] === x.id), 'dòng vẫn còn trên sheet');
  err(b.call('paramDelete', { id: 'TSKHONG' }, b.tk), 'KHONG_THAY');
  const nk = ok(b.call('audit', { bang: 'ThongSo', khoa: x.id }, b.tk)).nhatKy;
  assert.deepEqual(nk.map((n) => n.hanhDong), ['xoa', 'tao']);
  for (const a of ['paramSave', 'paramDelete', 'lineSave', 'productSave', 'lineProduct', 'runSet']) err(b.call(a, {}, 'gia.mao'), 'HET_PHIEN');
});

// ===== v1.2.0: bảng chương trình PLC theo chuyền + dịch một dòng =====
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
test('bảng chương trình: tải lên cho chuyền, tự tạo nhóm "Chương trình PLC", tải lại cùng chuyền thành phiên bản mới, opId không trùng', () => {
  const b = setup();
  ok(b.call('data', {}, b.tk));
  const r1 = ok(b.call('plcUpload', { chuyen: 'PL06', tenTep: 'VKY06.xlsx', mime: XLSX_MIME, b64: b64('PK-gia') }, b.tk, 'op-p1'));
  assert.equal(r1.bangMay.chuyen, 'PL06'); assert.equal(r1.taiLieu.phienBan, 1); assert.equal(r1.taiLieu.ten, 'Bảng chương trình 06');
  assert.equal(ok(b.call('plcUpload', { chuyen: 'PL06', tenTep: 'VKY06.xlsx', mime: XLSX_MIME, b64: b64('PK-gia') }, b.tk, 'op-p1')).dup, true);
  let d = ok(b.call('data', {}, b.tk));
  const nh = d.nhom.find((n) => n.ten === 'Chương trình PLC');
  assert.ok(nh, 'phải có nhóm Chương trình PLC'); assert.equal(nh.tenZh, 'PLC程序'); assert.equal(r1.taiLieu.nhom, nh.id);
  const r2 = ok(b.call('plcUpload', { chuyen: 'PL06', tenTep: 'VKY06-moi.xlsx', mime: XLSX_MIME, b64: b64('PK-moi') }, b.tk));
  assert.equal(r2.bangMay.id, r1.bangMay.id); assert.equal(r2.taiLieu.maTL, r1.taiLieu.maTL); assert.equal(r2.taiLieu.phienBan, 2);
  d = ok(b.call('data', {}, b.tk));
  assert.equal(d.bangMay.length, 1); assert.equal(d.nhom.filter((n) => n.ten === 'Chương trình PLC').length, 1, 'không tạo nhóm trùng');
  assert.equal(d.taiLieu.find((t) => t.maTL === r1.taiLieu.maTL && t.hienHanh).tenTep, 'VKY06-moi.xlsx');
  err(b.call('plcUpload', { chuyen: 'PLKHONG', tenTep: 'a.xlsx', mime: XLSX_MIME, b64: b64('x') }, b.tk), 'KHONG_THAY');
  err(b.call('plcUpload', { chuyen: 'PL23', tenTep: 'a.xlsx', mime: XLSX_MIME, b64: '' }, b.tk), 'TEP_RONG');
});

test('bảng chương trình: gỡ khỏi chuyền chỉ đánh dấu xoá (tệp vẫn ở Tài liệu), có nhật ký; cần đăng nhập', () => {
  const b = setup('demo');
  let d = ok(b.call('data', {}, b.tk));
  assert.deepEqual(d.bangMay.map((x) => x.chuyen).sort(), ['PL06', 'PL23']);
  ok(b.call('plcDelete', { id: 'BMTEST01' }, b.tk));
  d = ok(b.call('data', {}, b.tk));
  assert.deepEqual(d.bangMay.map((x) => x.chuyen), ['PL23']);
  assert.ok(d.taiLieu.some((t) => t.id === 'TLPLC01'), 'tệp vẫn còn ở Tài liệu');
  assert.ok(rawRows(b, 'BangMay').some((r) => r[0] === 'BMTEST01'));
  assert.deepEqual(ok(b.call('audit', { bang: 'BangMay', khoa: 'BMTEST01' }, b.tk)).nhatKy.map((n) => n.hanhDong), ['xoa']);
  err(b.call('plcDelete', { id: 'BMKHONG' }, b.tk), 'KHONG_THAY');
  for (const a of ['plcUpload', 'plcDelete', 'translate']) err(b.call(a, {}, 'gia.mao'), 'HET_PHIEN');
});

test('dịch một dòng: chữ Trung sang tiếng Việt; rỗng báo lỗi; Google Dịch lỗi thì báo rõ, không trả chữ rỗng', () => {
  const b = setup('demo');
  assert.equal(ok(b.call('translate', { text: 'X1002 | 粉碎机异常 | Y1002 | 粉碎机启动' }, b.tk)).dich, 'X1002 | Máy nghiền lỗi | Y1002 | Khởi động máy nghiền');
  err(b.call('translate', { text: '  ' }, b.tk), 'TRONG');
  b.ctx.__dich.loi = true;
  err(b.call('translate', { text: '粉碎机异常' }, b.tk), 'DICH');
});

// ===== v1.3.0: chuyền PLC tách riêng khỏi chuyền máy in =====
test('chuyền PLC: lần đầu tạo sẵn 16 chuyền theo đúng thứ tự, tách riêng 9 chuyền máy in', () => {
  const b = setup();
  const d = ok(b.call('data', {}, b.tk));
  assert.deepEqual(d.chuyenPLC.map((c) => c.ma), ['01', '02', '03', '04', '09', '10', '15', '21', '23', '06', '08', '12', '17', '18', '16', '13']);
  assert.equal(d.chuyen.length, 9, 'chuyền máy in giữ nguyên 9');
  ok(b.call('data', {}, b.tk));
  assert.equal(rawRows(b, 'ChuyenPLC').length, 16, 'tải lại không tạo thêm');
  err(b.call('plcUpload', { chuyen: 'CV06', tenTep: 'a.xlsx', mime: XLSX_MIME, b64: b64('x') }, b.tk), 'KHONG_THAY');
});

test('nâng cấp từ v1.2.0: bảng đã gắn với chuyền máy in (CV06) tự chuyển sang chuyền PLC cùng mã, không phải tải lại', () => {
  const b = setup();
  ok(b.call('data', {}, b.tk));
  // Giả lập dữ liệu v1.2.0: dòng BangMay trỏ vào chuyền máy in CV06 và CV27 (27 chưa có trong danh sách PLC)
  const r = ok(b.call('plcUpload', { chuyen: 'PL06', tenTep: 'VKY06.xlsx', mime: XLSX_MIME, b64: b64('PK') }, b.tk)).bangMay;
  const sh = b.ctx.SpreadsheetApp.getActive().getSheetByName('BangMay'), cot = b.ctx.BANG.BangMay.indexOf('Chuyen');
  sh.data[1][cot] = 'CV06';
  sh.data[2] = ['BMCU27', 'CV27', 'MTCU27', '2026-11-04 10:00:00', '', 0];
  const d = ok(b.call('data', {}, b.tk));
  assert.equal(d.bangMay.find((x) => x.id === r.id).chuyen, 'PL06');
  const c27 = d.chuyenPLC.find((c) => c.ma === '27');
  assert.ok(c27, 'chuyền 27 được thêm vào danh sách PLC');
  assert.equal(d.bangMay.find((x) => x.id === 'BMCU27').chuyen, c27.id);
  assert.deepEqual(ok(b.call('audit', { bang: 'BangMay', khoa: r.id }, b.tk)).nhatKy.map((n) => n.hanhDong)[0], 'nang_cap');
  ok(b.call('data', {}, b.tk));
  assert.equal(rawRows(b, 'ChuyenPLC').length, 17, 'chạy lại không thêm trùng');
});

test('chuyền PLC: thêm/sửa, chặn trùng mã, không ngừng dùng chuyền còn bảng chương trình', () => {
  const b = setup('demo');
  const c = ok(b.call('plcLineSave', { ma: '30' }, b.tk, 'op-c1')).chuyenPLC;
  assert.equal(ok(b.call('plcLineSave', { ma: '30' }, b.tk, 'op-c1')).dup, true);
  err(b.call('plcLineSave', { ma: '06' }, b.tk), 'TRUNG');
  err(b.call('plcLineSave', { ma: '' }, b.tk), 'TRONG');
  err(b.call('plcLineSave', { id: 'PL06', ma: '06', hoatDong: 0 }, b.tk), 'CON_BANG');
  ok(b.call('plcLineSave', { id: c.id, ma: '30', hoatDong: 0 }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).chuyenPLC.some((x) => x.ma === '30'));
  err(b.call('plcLineSave', {}, 'gia.mao'), 'HET_PHIEN');
});

// ===== v1.4.0: ghi chú theo địa chỉ PLC, có lịch sử =====
test('ghi chú địa chỉ PLC: mỗi lần lưu là một dòng mới (lịch sử), địa chỉ viết hoa bỏ dấu cách, tự dịch, opId không trùng', () => {
  const b = setup('demo');
  const x = ok(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: ' m 570 ', noiDung: 'Đã đổi sang cảm biến mới' }, b.tk, 'op-g1')).ghiChuPLC;
  assert.equal(x.id, 'GPOPG1'); assert.equal(x.diaChi, 'M570'); assert.equal(x.noiDungDich, '已更换为新传感器');
  assert.equal(ok(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: 'M570', noiDung: 'x' }, b.tk, 'op-g1')).dup, true);
  ok(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: 'M570', noiDung: 'Thêm nút dừng phụ' }, b.tk));
  ok(b.call('plcNoteSave', { chuyen: 'PL23', diaChi: 'M570', noiDung: 'Chuyền khác' }, b.tk));
  const ds = ok(b.call('data', {}, b.tk)).ghiChuPLC.filter((g) => g.chuyen === 'PL06' && g.diaChi === 'M570');
  assert.deepEqual(ds.map((g) => g.noiDung), ['Đã đổi sang cảm biến mới', 'Thêm nút dừng phụ'], 'giữ cả hai lần ghi');
  assert.equal(rawRows(b, 'GhiChuPLC').length, 3);
  const tay = ok(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: 'X1002', noiDung: 'abc', noiDungDich: '手改' }, b.tk)).ghiChuPLC;
  assert.deepEqual(tay.dichTay, { noiDung: 1 });
});

test('ghi chú địa chỉ PLC: chặn rỗng, chuyền không có; xoá lần ghi nhầm chỉ đánh dấu, có nhật ký; cần đăng nhập', () => {
  const b = setup('demo');
  err(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: '', noiDung: 'a' }, b.tk), 'TRONG');
  err(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: 'M1', noiDung: '  ' }, b.tk), 'TRONG');
  err(b.call('plcNoteSave', { chuyen: 'CV06', diaChi: 'M1', noiDung: 'a' }, b.tk), 'KHONG_THAY');
  const x = ok(b.call('plcNoteSave', { chuyen: 'PL06', diaChi: '=M1', noiDung: '-24V' }, b.tk)).ghiChuPLC;
  const cot = b.ctx.BANG.GhiChuPLC, dong = b.ctx.thanhDong('GhiChuPLC', x);
  assert.equal(dong[cot.indexOf('NoiDung')], "'-24V");
  ok(b.call('plcNoteDelete', { id: x.id }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).ghiChuPLC.some((g) => g.id === x.id));
  assert.ok(rawRows(b, 'GhiChuPLC').some((r) => r[0] === x.id));
  assert.deepEqual(ok(b.call('audit', { bang: 'GhiChuPLC', khoa: x.id }, b.tk)).nhatKy.map((n) => n.hanhDong), ['xoa', 'tao']);
  err(b.call('plcNoteDelete', { id: 'GPKHONG' }, b.tk), 'KHONG_THAY');
  for (const a of ['plcNoteSave', 'plcNoteDelete']) err(b.call(a, {}, 'gia.mao'), 'HET_PHIEN');
});

// ===== v1.5.0: bảng tính Encoder/Delay/Alignment lưu theo đầu in, có lịch sử =====
const TINH1 = { encoderPPR: '2500', duongKinh: '120', soCanh: 4, divider: '49', kheHoPB1: '0', lechPB2: '1,8', daiSP: '190', tocDo: '850', dpiMoi: '74.86', dpiLapTrinh: '1200' };
test('bảng tính đầu in: lưu đúng các ô xanh, mỗi lần lưu một dòng mới (lịch sử), máy 2 màu nhận JA1–8, opId không trùng', () => {
  const b = setup('demo');
  const x = ok(b.call('calcSave', Object.assign({ chuyen: 'CV23', sanPham: 'SPTEST05', thucTe: '0/15/30/45/64/79/94/109', tinhRa: '0/15/30/45/63.97/78.97/93.97/108.97', ghiChu: 'Thông số ban đầu' }, TINH1), b.tk, 'op-t1')).tinhDauIn;
  assert.equal(x.id, 'TDOPT1'); assert.equal(x.lechPB2, '1.8'); assert.equal(x.soCanh, '4'); assert.equal(x.divider, '49');
  assert.equal(x.thucTe.split('/').length, 8); assert.equal(x.tinhRa.split('/')[4], '63.97'); assert.equal(x.ghiChuDich, '初始参数');
  assert.equal(ok(b.call('calcSave', Object.assign({ chuyen: 'CV23' }, TINH1), b.tk, 'op-t1')).dup, true);
  ok(b.call('calcSave', Object.assign({ chuyen: 'CV23' }, TINH1, { divider: '12' }), b.tk));
  const ds = ok(b.call('data', {}, b.tk)).tinhDauIn.filter((t) => t.chuyen === 'CV23');
  assert.deepEqual(ds.map((t) => t.divider), ['49', '12']);
  assert.equal(ds[1].dpiMoi, '74.86'); assert.equal(ds[1].kheHoPB1, '0');
});

test('bảng tính đầu in: máy 1 màu chỉ JA1–4; chặn ô bắt buộc trống, số sai, edges lạ, chuyền/SP không có; xoá chỉ đánh dấu; cần đăng nhập', () => {
  const b = setup('demo');
  const p = (o) => Object.assign({ chuyen: 'CV01' }, TINH1, o);
  err(b.call('calcSave', p({ thucTe: '1/2/3/4/5' }), b.tk), 'SO');
  err(b.call('calcSave', p({ divider: '' }), b.tk), 'TRONG');
  err(b.call('calcSave', p({ duongKinh: 'abc' }), b.tk), 'SO');
  err(b.call('calcSave', p({ soCanh: 3 }), b.tk), 'SO');
  err(b.call('calcSave', p({ thucTe: '0/15.5' }), b.tk), 'SO');
  err(b.call('calcSave', p({ chuyen: 'PL06' }), b.tk), 'KHONG_THAY');
  err(b.call('calcSave', p({ sanPham: 'SPKHONG' }), b.tk), 'KHONG_THAY');
  const x = ok(b.call('calcSave', p({ thucTe: '0/15/30/45' }), b.tk)).tinhDauIn;
  ok(b.call('calcDelete', { id: x.id }, b.tk));
  assert.ok(!ok(b.call('data', {}, b.tk)).tinhDauIn.some((t) => t.id === x.id));
  assert.ok(rawRows(b, 'TinhDauIn').some((r) => r[0] === x.id));
  assert.deepEqual(ok(b.call('audit', { bang: 'TinhDauIn', khoa: x.id }, b.tk)).nhatKy.map((n) => n.hanhDong), ['xoa', 'tao']);
  for (const a of ['calcSave', 'calcDelete']) err(b.call(a, {}, 'gia.mao'), 'HET_PHIEN');
});
