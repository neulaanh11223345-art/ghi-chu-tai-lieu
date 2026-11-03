// ===== Dữ liệu mẫu cho bản xem thử (demo.html) =====
// Chạy sau Code.gs trong máy chủ giả. Repo công khai: chỉ dùng số TEST-*, không đưa nội dung sổ tay thật
// (sổ tay của nhà cung cấp là tài liệu mật — bản thật chỉ tải lên qua app, nằm trong Drive riêng tư).
__tz.off = 7 * 3600000;

// Câu mẫu Google Dịch giả biết dịch: [tiếng Việt, tiếng Trung]
__dichMau.push(
  ['Kiểm tra áp suất meniscus', '检查弯月面压力'],
  ['Thay lọc mực', '更换墨水过滤器'],
  ['Đầu in mờ khi chạy nhanh', '高速运行时喷印模糊'],
  ['Hạ tốc độ xuống 800 miếng/phút thì in đẹp lại.', '速度降到每分钟800片后喷印恢复正常。'],
  ['Lịch xả và lau đầu in', '喷头清洗擦拭计划'],
  ['Xả ngắn mỗi 10 phút khi chạy 900 miếng/phút.', '每分钟900片运行时每10分钟短清洗一次。'],
  ['Sổ tay thiết bị', '设备手册'], ['Bản vẽ điện', '电气图纸'], ['Quy trình', '操作规程'], ['Khác', '其他'],
  ['Sổ tay đầu in mẫu', '喷头手册样本'], ['Sơ đồ đi dây mẫu', '接线图样本'], ['Quy trình thay lọc mẫu', '换滤芯规程样本'],
  ['Nguồn 24 VDC', '24 VDC 电源'], ['Nguồn 12 VDC cho trigger', '触发器 12 VDC 电源'], ['Mass chung', '公共地线'],
  ['Tín hiệu encoder kênh A', '编码器A相信号'], ['Tín hiệu encoder kênh B', '编码器B相信号'], ['Nối đất', '接地'],
  ['Ghi chú thử', '测试笔记'], ['Bảo trì', '维护'],
  ['Thông số ban đầu', '初始参数'], ['Tăng điện áp vì in mờ', '因喷印模糊提高电压'], ['Hạ divider để giảm tần số', '调整分频以降低频率'], ['Băng 330 mm', '330毫米卫生巾'], ['Băng 190 mm', '190毫米卫生巾'], ['PB2 in mờ, tăng áp', 'PB2喷印模糊，提高电压']
);

// PDF một trang nhỏ, tự tạo (có bảng xref đúng) — để thử mở tài liệu và nút "Mở bản vẽ" trong bản xem thử
function pdfMau(dong) {
  var o = [], noi = '', i;
  var luong = 'BT /F1 18 Tf 60 760 Td (' + dong[0] + ') Tj ET\n';
  for (i = 1; i < dong.length; i++) luong += 'BT /F1 12 Tf 60 ' + (740 - i * 22) + ' Td (' + dong[i] + ') Tj ET\n';
  var vat = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + luong.length + ' >>\nstream\n' + luong + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  noi = '%PDF-1.4\n';
  for (i = 0; i < vat.length; i++) { o.push(noi.length); noi += (i + 1) + ' 0 obj\n' + vat[i] + '\nendobj\n'; }
  var xref = noi.length;
  noi += 'xref\n0 ' + (vat.length + 1) + '\n0000000000 65535 f \n';
  o.forEach(function (n) { noi += ('000000000' + n).slice(-10) + ' 00000 n \n'; });
  noi += 'trailer\n<< /Size ' + (vat.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  var b = []; for (i = 0; i < noi.length; i++) b.push(noi.charCodeAt(i));
  return b;
}

(function napMau() {
  caiDatBanDau();
  var bay = thoiGianStr();
  // Ghi chú mẫu
  themNhieu('GhiChu', [
    thanhDong('GhiChu', { id: 'GCTEST01', tieuDe: 'Đầu in mờ khi chạy nhanh', tieuDeDich: '高速运行时喷印模糊',
      noiDung: 'Hạ tốc độ xuống 800 miếng/phút thì in đẹp lại.', noiDungDich: '速度降到每分钟800片后喷印恢复正常。',
      the: JSON.stringify(['TEST-01', 'đầu in', 'tốc độ']), anh: '', maMay: 'TEST-MAY-01', lucTao: '2026-11-01 08:15:00', capNhat: '2026-11-01 08:15:00',
      opId: '', xoa: 0, dichTay: '' }),
    thanhDong('GhiChu', { id: 'GCTEST02', tieuDe: 'Lịch xả và lau đầu in', tieuDeDich: '喷头清洗擦拭计划',
      noiDung: 'Xả ngắn mỗi 10 phút khi chạy 900 miếng/phút.', noiDungDich: '每分钟900片运行时每10分钟短清洗一次。',
      the: JSON.stringify(['TEST-02', 'bảo trì']), anh: '', maMay: 'TEST-MAY-01', lucTao: '2026-11-02 14:40:00', capNhat: '2026-11-02 14:40:00',
      opId: '', xoa: 0, dichTay: '' })
  ]);
  // Tài liệu mẫu: một tệp PDF (2 phiên bản, bản 2 đang hiệu lực), một link Drive
  var thu = thuMuc('TaiLieu');
  var f1 = thu.createFile(Utilities.newBlob(pdfMau(['TEST - So do di day mau (ban 1)', 'Tai lieu mau cho ban xem thu', 'Day TEST-101: PS2-L -> TB1-1']), 'application/pdf', 'TEST-so-do-v1.pdf'));
  var f2 = thu.createFile(Utilities.newBlob(pdfMau(['TEST - So do di day mau (ban 2)', 'Tai lieu mau cho ban xem thu', 'Day TEST-101: PS2-L -> TB1-1', 'Day TEST-102: PS2-H -> J53-1']), 'application/pdf', 'TEST-so-do-v2.pdf'));
  function tl(o) { var x = { ten: '', tenDich: '', the: '', mime: '', kichThuoc: 0, url: '', fileId: '', tenTep: '', lucTao: bay, capNhat: bay, opId: '', xoa: 0, dichTay: '' };
    Object.keys(o).forEach(function (k) { x[k] = o[k]; }); return thanhDong('TaiLieu', x); }
  themNhieu('TaiLieu', [
    tl({ id: 'TLTEST01', maTL: 'MTTEST01', ten: 'Sơ đồ đi dây mẫu', tenDich: '接线图样本', nhom: 'NH02', kieu: 'FILE', fileId: f1.getId(),
      mime: 'application/pdf', kichThuoc: f1.getSize(), phienBan: 1, hienHanh: 0, the: JSON.stringify(['TEST-BV01']), tenTep: 'TEST-so-do-v1.pdf',
      lucTao: '2026-10-20 09:00:00' }),
    tl({ id: 'TLTEST02', maTL: 'MTTEST01', ten: 'Sơ đồ đi dây mẫu', tenDich: '接线图样本', nhom: 'NH02', kieu: 'FILE', fileId: f2.getId(),
      mime: 'application/pdf', kichThuoc: f2.getSize(), phienBan: 2, hienHanh: 1, the: JSON.stringify(['TEST-BV01']), tenTep: 'TEST-so-do-v2.pdf',
      lucTao: '2026-11-01 09:00:00' }),
    tl({ id: 'TLTEST03', maTL: 'MTTEST03', ten: 'Sổ tay đầu in mẫu', tenDich: '喷头手册样本', nhom: 'NH01', kieu: 'LINK',
      url: 'https://drive.google.com/file/d/TEST-LINK-01/view', phienBan: 1, hienHanh: 1, the: JSON.stringify(['TEST-HM']) })
  ]);
  // Bảng dây mẫu (số dây TEST-*, không phải dữ liệu bản vẽ thật)
  function day(id, so, to, tu, den, mau, th, zh) {
    return thanhDong('DayDien', { id: id, soDay: so, banVe: 'TEST-BV01', to: to, tuDiem: tu, denDiem: den, mau: mau, tinHieu: th, tinHieuZh: zh,
      taiLieuId: 'TLTEST02', trang: 1, ghiChu: '', capNhat: bay, opId: '', xoa: 0, dichTay: '' });
  }
  themNhieu('DayDien', [
    day('DDTEST01', 'TEST-101', '5', 'PS2-L', 'TB1-1', 'Cam/Đen', 'Nguồn 24 VDC', '24 VDC 电源'),
    day('DDTEST02', 'TEST-102', '5', 'PS2-H', 'J53-1', 'Vàng/Đen', 'Nguồn 12 VDC cho trigger', '触发器 12 VDC 电源'),
    day('DDTEST03', 'TEST-103', '15', 'J53-14', 'gSDP', 'Trắng', 'Tín hiệu encoder kênh A', '编码器A相信号'),
    day('DDTEST04', 'TEST-104', '15', 'J53-15', 'gSDP', 'Xanh dương', 'Tín hiệu encoder kênh B', '编码器B相信号'),
    day('DDTEST05', 'TEST-105', '25', 'TB-PE', 'Vỏ tủ', 'Xanh lá/Vàng', 'Nối đất', '接地')
  ]);
  // Sản phẩm, chuyền và thông số mẫu (mã TEST-*, số liệu minh hoạ — không phải thông số thật của nhà máy)
  // Chuyền đã được caiDatBanDau() tạo sẵn ở đầu hàm này
  function sp(id, ma, ten, zh, dai) { return thanhDong('SanPham', { id: id, ma: ma, ten: ten, tenDich: zh, daiSP: dai, ghiChu: '', hoatDong: 1, capNhat: bay, opId: '', dichTay: '' }); }
  themNhieu('SanPham', [sp('SPTEST01', 'TEST-SP01', 'Băng 190 mm', '190毫米卫生巾', '190'), sp('SPTEST02', 'TEST-SP02', 'Băng 290 mm', '290毫米卫生巾', '290'),
    sp('SPTEST05', 'TEST-SP05', 'Băng 2 màu 190 mm', '双色190毫米卫生巾', '190'), sp('SPTEST06', 'TEST-SP06', 'Băng 2 màu 290 mm', '双色290毫米卫生巾', '290'),
    sp('SPTEST07', 'TEST-SP07', 'Băng 2 màu ban đêm', '双色夜用卫生巾', '330')]);
  var lk = [['CV01', 'SPTEST01'], ['CV01', 'SPTEST02'], ['CV09', 'SPTEST02'], ['CV21', 'SPTEST01'], ['CV23', 'SPTEST05'], ['CV23', 'SPTEST06'], ['CV23', 'SPTEST07'], ['CV06', 'SPTEST06']];
  themNhieu('ChuyenSP', lk.map(function (l, i) { return thanhDong('ChuyenSP', { id: 'CSTEST0' + (i + 1), chuyen: l[0], sanPham: l[1], hoatDong: 1, capNhat: bay, opId: '' }); }));
  var ch = [['CV01', 'SPTEST01', '2026-10-01'], ['CV09', 'SPTEST02', '2026-10-01'], ['CV21', 'SPTEST01', '2026-10-01'],
    ['CV23', 'SPTEST06', '2026-09-30'], ['CV23', 'SPTEST05', '2026-10-15'], ['CV06', 'SPTEST06', '2026-10-01']];
  themNhieu('ChaySP', ch.map(function (c, i) { return thanhDong('ChaySP', { id: 'CYTEST0' + (i + 1), chuyen: c[0], sanPham: c[1], tuNgay: c[2], lucTao: bay, opId: '', xoa: 0 }); }));
  var cv = docBang('Chuyen');
  cv.forEach(function (c) { if (c.id === 'CV01' || c.id === 'CV23') { c.seriDau = 'TEST-SN-' + c.ma; c.thayDau = '2026-08-01'; c.thayLoc = '2026-10-10'; suaDong('Chuyen', c._r, thanhDong('Chuyen', c)); } });
  var goc = { encDir: 'Forward', encDecode: 'All Four Edges', encDPI: '112.3', divider: '6', triggerMode: 'Once per Image', fireMode: 'External', formDelay: '0.5',
    align: '0/121/243/364', registration: '0', volt: '98/98/99/98', meniscus: '5', lungVac: '', purgeShort: '1.5', purgeLong: '3.5', nhietTam: '125',
    nhietBinh1: '120', lois1: '50', muc1: 'TEST-MUC', nhietBinh2: '', lois2: '', muc2: '', tocDo: '900', ghiChuDich: '', lucTao: bay, opId: '', xoa: 0, dichTay: '' };
  function ts(o) { var x = {}; Object.keys(goc).forEach(function (k) { x[k] = goc[k]; }); Object.keys(o).forEach(function (k) { x[k] = o[k]; }); return thanhDong('ThongSo', x); }
  var hai = { soMau: 2, align: '0/121/243/364/520/641/763/884', volt: '98/98/99/98/102/101/102/101', nhietBinh2: '120', lois2: '50', muc1: 'TEST-XANH', muc2: 'TEST-TIM' };
  themNhieu('ThongSo', [
    ts({ id: 'TSTEST01', chuyen: 'CV01', sanPham: 'SPTEST01', soMau: 1, apDung: '2026-10-01', ghiChu: 'Thông số ban đầu', ghiChuDich: '初始参数', volt: '96/96/97/96' }),
    ts({ id: 'TSTEST02', chuyen: 'CV01', sanPham: 'SPTEST01', soMau: 1, apDung: '2026-10-28', ghiChu: 'Tăng điện áp vì in mờ', ghiChuDich: '因喷印模糊提高电压' }),
    ts({ id: 'TSTEST03', chuyen: 'CV09', sanPham: 'SPTEST02', soMau: 1, apDung: '2026-10-01', ghiChu: 'Thông số ban đầu', ghiChuDich: '初始参数', divider: '10', encDPI: '67.4', align: '0/73/146/219' }),
    ts({ id: 'TSTEST04', chuyen: 'CV23', sanPham: 'SPTEST05', apDung: '2026-10-15', ghiChu: 'Thông số ban đầu', ghiChuDich: '初始参数', soMau: 2, align: hai.align, volt: hai.volt, nhietBinh2: '120', lois2: '50', muc1: 'TEST-XANH', muc2: 'TEST-TIM' }),
    ts({ id: 'TSTEST05', chuyen: 'CV23', sanPham: 'SPTEST06', apDung: '2026-09-30', ghiChu: 'Thông số ban đầu', ghiChuDich: '初始参数', soMau: 2, align: hai.align, volt: hai.volt, nhietBinh2: '120', lois2: '50', muc1: 'TEST-XANH', muc2: 'TEST-TIM', divider: '10', encDPI: '67.4', tocDo: '800' })
  ]);
})();

return {
  call: function (req) { return JSON.parse(JSON.stringify(xuLy(JSON.parse(JSON.stringify(req))))); },
  net: __net
};
