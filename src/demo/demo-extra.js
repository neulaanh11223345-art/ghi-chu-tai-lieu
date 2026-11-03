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
  ['Ghi chú thử', '测试笔记'], ['Bảo trì', '维护']
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
})();

return {
  call: function (req) { return JSON.parse(JSON.stringify(xuLy(JSON.parse(JSON.stringify(req))))); },
  net: __net
};
