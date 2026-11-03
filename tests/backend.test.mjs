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
  for (const t of ['GhiChu', 'NhomTL', 'TaiLieu', 'DayDien', 'CauHinhMay', 'NhatKy', 'NguoiDung']) assert.ok(b.ctx.SpreadsheetApp.getActive().getSheetByName(t), t);
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
