// Kiểm thử toàn luồng trên bản xem thử (docs/demo.html) bằng Playwright, khổ iPhone 390×844.
// Bấm thật như người dùng: đăng nhập PIN, ghi chú có ảnh, mất mạng rồi có mạng, tải tài liệu + phiên bản,
// tra dây → mở bản vẽ, nhập Excel, máy tính DPI/tần số/delay, xuất Excel song ngữ. Không được có lỗi JavaScript.
// Chạy: node tools/build.mjs && node tests/e2e.mjs [thư-mục-ảnh]
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';

const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_DEMO = pathToFileURL(join(ROOT, 'docs/demo.html')).href;
const SHOTS = process.argv[2] || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await pw.chromium.launch();
const errs = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
// Hộp "Xoá mục này?" — người dùng bấm Đồng ý
page.on('dialog', (d) => d.accept());
const shot = async (n) => { if (SHOTS) { await page.waitForTimeout(250); await page.screenshot({ path: join(SHOTS, n + '.png') }); } };
const wait = (ms) => page.waitForTimeout(ms || 400);
const text = (sel) => page.textContent(sel);
let step = 0;
const ok = (msg) => console.log(`✓ ${++step}. ${msg}`);
// Thông số / Tính toán / Tra dây nằm trong tab "Máy in" (màn con chọn ở thanh trên).
// v1.6: thanh dưới = Trang chủ · Ghi chú · Tìm (nút giữa) · Máy in · Thêm; Tài liệu và Chương trình mở từ "Thêm"
const tab = async (v) => {
  if (['may', 'tinh', 'day'].includes(v)) { await page.click('.tabs .tab[data-v="mayin"]'); await wait(); await page.click(`.seg button[data-v="${v}"]`); }
  else if (['tl', 'ct'].includes(v)) { await page.click('.tabs .tab[data-v="them"]'); await wait(); await page.click(`#main .row[data-act="goV"][data-v="${v}"]`); }
  else await page.click(`.tabs .tab[data-v="${v}"]`);
  await wait();
};
const bamPin = async (pin) => { for (const k of pin) await page.click(`#pinPad button[data-k="${k}"]`); await wait(700); };
// Ảnh PNG 1×1 làm "ảnh chụp tại chỗ"
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

try {
  await page.goto(URL_DEMO);
  await wait(600);

  // 1. Đăng nhập: sai PIN báo lỗi song ngữ; đúng PIN mặc định thì nhắc đổi PIN
  await bamPin('000000');
  assert.match(await text('#lErr'), /PIN/);
  await shot('01-dang-nhap');
  await bamPin('111111');
  await page.waitForSelector('#main');
  assert.match(await text('.toast'), /PIN mặc định/);
  assert.match(await text('.toast'), /默认PIN/);
  ok('Đăng nhập PIN; sai PIN báo lỗi; PIN mặc định được nhắc đổi');

  // 1b. v1.6 Trang chủ: lời chào, 6 ô tổng quan (bấm vào mở thẳng từng phần), thanh dưới có nút Tìm ở giữa, nút Cập nhật
  assert.match(await text('header.bar h1'), /Trang chủ/);
  assert.match(await text('header.bar h1'), /首页/);
  assert.match(await text('#netInfo'), /Đã đồng bộ/);
  assert.equal(await page.locator('#main .mtile').count(), 6);
  for (const v of ['gc', 'tl', 'may', 'tinh', 'day', 'ct']) assert.equal(await page.locator(`#main .mtile[data-v="${v}"]`).count(), 1, 'thiếu ô ' + v);
  assert.match(await text('.mtile[data-v="day"]'), /3\s*mạch/);
  assert.match(await text('.mtile[data-v="day"]'), /1 chỗ cần kiểm tra/);
  assert.match(await text('.mtile[data-v="ct"]'), /\/16/);
  assert.match(await text('.mtile[data-v="may"]'), /2 chuyền chưa có encoder/);
  assert.match(await text('#main .hello'), /Chủ app/);
  assert.equal((await text('#caiBtn')).trim(), 'C');
  assert.deepEqual(await page.locator('.tabs .tab').evaluateAll((a) => a.map((x) => x.dataset.v)), ['home', 'gc', 'tim', 'mayin', 'them']);
  assert.equal(await page.locator('.tabs .tab.sc[data-v="tim"]').count(), 1, 'nút Tìm ở giữa');
  assert.equal(await page.locator('.tabs .bdg:visible').count(), 0, 'không có việc chờ thì không hiện số');
  await shot('01b-trang-chu');
  await page.click('.mtile[data-v="day"]');
  await wait();
  assert.equal(await page.locator('.seg button.on[data-v="day"]').count(), 1);
  await page.click('.tabs .tab[data-v="home"]');
  await wait();
  await page.click('#capNhatBtn');
  await page.waitForSelector('.toast:has-text("Đã cập nhật")', { timeout: 5000 });
  assert.match(await text('.toast'), /Đã cập nhật dữ liệu mới nhất/);
  assert.match(await text('.toast'), /已更新/);
  await wait(300);
  assert.match(await text('#lanCuoi'), /Cập nhật lúc/);
  assert.equal(await page.locator('#capNhatBtn[disabled]').count(), 0, 'xong thì nút bấm lại được');
  ok('Trang chủ kiểu app bảo dưỡng: ô tổng quan, thanh dưới 5 nút, nút Cập nhật tải lại dữ liệu');

  // 2. Trang Tìm: gõ không dấu ra cả ghi chú, tài liệu, dây
  await tab('tim');
  await page.fill('#q', 'nguon 24');
  await wait(500);
  assert.equal(await page.locator('#main .row.wire').count(), 1);
  assert.match(await text('#main .row.wire'), /TEST-101/);
  await page.fill('#q', 'dau in');
  await wait(500);
  assert.ok(await page.locator('#main .row.note').count() >= 2, 'tìm "dau in" phải ra ghi chú mẫu');
  assert.ok(await page.locator('#main .row.doc').count() >= 1, 'tìm "dau in" phải ra tài liệu "Sổ tay đầu in mẫu"');
  assert.ok(await page.locator('#main mark').count() > 0, 'chữ khớp phải được tô');
  await shot('02-tim-kiem');
  await page.fill('#q', '编码器');
  await wait(500);
  assert.equal(await page.locator('#main .row.wire').count(), 2);
  await page.fill('#q', 'khongcogi-xyz');
  await wait(500);
  assert.match(await text('#main'), /Không thấy kết quả/);
  await page.fill('#q', '');
  ok('Một ô tìm cho ghi chú + tài liệu + dây, không dấu và chữ Trung đều tìm được');

  // 3. Ghi chú mới có ảnh, tự dịch tiếng Trung
  await tab('gc');
  await page.click('#fabNote');
  await page.fill('#nTitle', 'Thay lọc mực');
  await page.fill('#nBody', 'Thay lọc mực');
  await page.fill('#nTags', 'TEST-03, bảo trì');
  await page.setInputFiles('#nPhoto', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
  await wait(600);
  assert.equal(await page.locator('#nThumbs .th').count(), 1);
  await shot('03-ghi-chu-moi');
  await page.click('#nSave');
  await wait(800);
  const moi = page.locator('#main .row.note', { hasText: 'Thay lọc mực' });
  assert.equal(await moi.count(), 1);
  assert.match(await moi.textContent(), /更换墨水过滤器/);
  ok('Ghi chú có ảnh chụp tại chỗ, tiêu đề tự dịch sang tiếng Trung');

  // 4. Mở ghi chú: ảnh tải qua máy chủ; sửa tay bản dịch → lưu lại vẫn giữ bản sửa tay
  await moi.click();
  await wait(800);
  assert.ok(await page.locator('#ov .thumbs img[src^="data:image"]').count() === 1, 'ảnh phải hiện');
  await page.click('#ov [data-act="noteEdit"]');
  await wait();
  await page.fill('#nTitleZh', '更换过滤器（手改）');
  await page.click('#nSave');
  await wait(700);
  await page.locator('#main .row.note', { hasText: 'Thay lọc mực' }).click();
  await wait(500);
  await page.click('#ov [data-act="noteEdit"]');
  await wait();
  await page.fill('#nBody', 'Thay lọc mực — lần 2');
  await page.click('#nSave');
  await wait(700);
  assert.match(await page.locator('#main .row.note', { hasText: 'Thay lọc mực' }).textContent(), /更换过滤器（手改）/);
  ok('Sửa tay bản dịch tiếng Trung thì lần lưu sau không bị dịch đè');

  // 5. Lọc theo thẻ
  await page.click('.chips button[data-t="TEST-03"]');
  await wait();
  assert.equal(await page.locator('#main .row.note').count(), 1);
  await page.click('.chips button[data-t=""]');
  await wait();
  ok('Lọc ghi chú theo thẻ');

  // 6. Mất mạng: ghi chú vào hàng chờ, hiện "chờ gửi"; có mạng tự gửi, không trùng
  await page.click('#caiBtn');
  await wait();
  await page.click('[data-act="simOff"]');
  await wait();
  assert.match(await text('#netInfo'), /Mất mạng/);
  await tab('gc');
  const truoc = await page.locator('#main .row.note').count();
  await page.click('#fabNote');
  await page.fill('#nTitle', 'Ghi chú thử');
  await page.fill('#nBody', 'Viết khi mất mạng');
  await page.click('#nSave');
  await wait(700);
  assert.equal(await page.locator('#main .row.note').count(), truoc + 1);
  assert.match(await text('#qBtn'), /1 chờ gửi/);
  assert.match(await page.locator('#main .row.note', { hasText: 'Ghi chú thử' }).textContent(), /chờ gửi/);
  await shot('04-mat-mang');
  // Sửa luôn ghi chú còn trong hàng chờ (mã đã biết trước nhờ opId)
  await page.locator('#main .row.note', { hasText: 'Ghi chú thử' }).click();
  await wait();
  await page.click('#ov [data-act="noteEdit"]');
  await wait();
  await page.fill('#nBody', 'Viết khi mất mạng — đã sửa');
  await page.click('#nSave');
  await wait(600);
  assert.match(await text('#qBtn'), /2 chờ gửi/);
  // v1.6: số việc chờ hiện trên nút Trang chủ; bấm Cập nhật lúc mất mạng thì báo lỗi, việc chờ vẫn giữ nguyên
  assert.equal((await text('.tabs .tab[data-v="home"] .bdg')).trim(), '2');
  await page.click('.tabs .tab[data-v="home"]');
  await wait();
  assert.match(await text('#main .alert'), /2 việc đang chờ gửi/);
  await page.click('#capNhatBtn');
  await page.waitForSelector('.toast.bad', { timeout: 5000 });
  assert.match(await text('.toast.bad'), /Không kết nối được máy chủ/);
  assert.match(await text('#qBtn'), /2 chờ gửi/);
  await page.click('#caiBtn');
  await wait();
  assert.equal(await page.locator('.qitem').count(), 2);
  await page.click('[data-act="simOff"]');
  await wait(2000);
  assert.equal(await page.locator('#qBtn').count(), 0, 'hàng chờ phải gửi hết');
  await tab('gc');
  const gcThu = page.locator('#main .row.note', { hasText: 'Ghi chú thử' });
  assert.equal(await gcThu.count(), 1, 'không được tạo trùng');
  assert.match(await gcThu.textContent(), /测试笔记/);
  assert.doesNotMatch(await gcThu.textContent(), /chờ gửi/);
  ok('Mất mạng vẫn ghi và sửa được; có mạng tự gửi theo opId, không trùng');

  // 7. Xoá ghi chú (đánh dấu xoá)
  await gcThu.click();
  await wait();
  await page.click('#ov [data-act="noteDel"]');
  await wait(700);
  assert.equal(await page.locator('#main .row.note', { hasText: 'Ghi chú thử' }).count(), 0);
  ok('Xoá ghi chú');

  // 8. Tài liệu: tải PDF lên, tự dịch tên, rồi tải phiên bản 2 và đổi bản hiệu lực
  await tab('tl');
  assert.ok(await page.locator('#main .row.doc').count() >= 2);
  await page.click('.chips button[data-n="NH03"]');
  await wait();
  await page.click('#fabDoc');
  await wait();
  await page.setInputFiles('#dFile', { name: 'Quy-trinh.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.fill('#dName', 'Quy trình thay lọc mẫu');
  await page.fill('#dTags', 'TEST-QT');
  await page.click('#dSave');
  await wait(900);
  assert.match(await text('#ov'), /换滤芯规程样本/);
  assert.match(await text('#ov'), /v1/);
  await page.click('#ov [data-act="docNewVer"]');
  await wait();
  await page.setInputFiles('#dFile', { name: 'Quy-trinh-v2.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.click('#dSave');
  await wait(900);
  assert.equal(await page.locator('#ov .ver').count(), 2);
  assert.match(await page.locator('#ov .ver').first().textContent(), /v2.*Đang hiệu lực/);
  await shot('05-tai-lieu-phien-ban');
  await page.locator('#ov .ver', { hasText: 'v1' }).locator('[data-act="verCurrent"]').click();
  await wait(800);
  assert.match(await page.locator('#ov .ver', { hasText: 'v1' }).textContent(), /Đang hiệu lực/);
  await page.click('#ov [data-act="close"]');
  await wait();
  assert.match(await page.locator('#main .row.doc', { hasText: 'Quy trình thay lọc mẫu' }).textContent(), /v1.*2 bản/);
  ok('Tải PDF, tên tự dịch; nhiều phiên bản, đặt bản hiệu lực');

  // 9. Dán link Drive; link sai bị chặn
  await page.click('#fabDoc');
  await wait();
  await page.click('#dKieu button[data-k="LINK"]');
  await page.fill('#dName', 'Link thử');
  await page.fill('#dUrl', 'ftp://sai');
  await page.click('#dSave');
  await wait();
  assert.match(await text('.toast'), /https/);
  await page.fill('#dUrl', 'https://drive.google.com/file/d/TEST-LINK-02/view');
  await page.click('#dSave');
  await wait(800);
  assert.match(await text('#ov'), /Link/);
  await page.click('#ov [data-act="close"]');
  await page.click('.chips button[data-n=""]');
  await wait();
  ok('Dán link Drive, link không https bị chặn');

  // 10. Mở PDF xem trong app và lưu xem khi mất mạng
  await page.locator('#main .row.doc', { hasText: 'Sơ đồ đi dây mẫu' }).click();
  await wait();
  await page.locator('#ov .ver').first().locator('[data-act="verOffline"]').click();
  await wait(900);
  assert.match(await page.locator('#ov .ver').first().textContent(), /offline/);
  await page.locator('#ov .ver').first().locator('[data-act="verOpen"]').click();
  await page.waitForSelector('#viewer #vFrame');
  await page.click('#viewer [data-act="viewClose"]');
  await page.click('#ov [data-act="close"]');
  await wait();
  ok('Mở PDF trong app; lưu tài liệu để xem khi mất mạng');

  // 11. Tra dây → Mở bản vẽ đúng trang
  await tab('day');
  await page.fill('#wq', 'J53');
  await wait(500);
  assert.equal(await page.locator('#main .row.wire').count(), 3);
  await page.fill('#wq', 'test-103');
  await wait(500);
  assert.equal(await page.locator('#main .row.wire').count(), 1);
  await shot('06-tra-day');
  await page.click('#main .row.wire');
  await wait();
  assert.match(await text('#ov'), /编码器A相信号/);
  await page.click('#ov [data-act="wireOpenDoc"]');
  await page.waitForSelector('#viewer #vFrame');
  assert.match(await page.getAttribute('#vFrame', 'src'), /#page=1$/);
  await page.click('#viewer [data-act="viewClose"]');
  await page.click('#ov [data-act="close"]');
  ok('Tra dây theo số/điểm, mở bản vẽ PDF đúng trang');

  // 12. Thêm dây tay; trùng số dây cùng tờ bị chặn
  await page.fill('#wq', '');
  await wait(400);
  await page.click('#fabWire');
  await wait();
  await page.fill('#wSo', 'TEST-150');
  await page.fill('#wBanVe', 'TEST-BV01');
  await page.fill('#wTo', '15');
  await page.fill('#wTu', 'J53-20');
  await page.fill('#wDen', 'gSDP');
  await page.fill('#wTin', 'Mass chung');
  await page.selectOption('#wDoc', 'TLTEST02');
  await page.fill('#wTrang', '1');
  await page.click('#wSave');
  await wait(700);
  assert.match(await page.locator('#main .row.wire', { hasText: 'TEST-150' }).textContent(), /公共地线/);
  await page.click('#fabWire');
  await wait();
  await page.fill('#wSo', 'TEST-150');
  await page.fill('#wBanVe', 'TEST-BV01');
  await page.fill('#wTo', '15');
  await page.click('#wSave');
  await wait(500);
  assert.match(await text('.toast'), /Đã có dây/);
  await page.click('#ov [data-act="close"]');
  ok('Thêm dây, tín hiệu tự dịch; trùng số dây trên cùng tờ bị chặn');

  // 13. Nhập dây từ Excel (file .xlsx nén thật): thêm 1, cập nhật 1, 1 dòng lỗi
  await page.click('[data-act="wireImport"]');
  await wait();
  await page.setInputFiles('#wImport', join(ROOT, 'tests/fixtures/TEST-day.xlsx'));
  await page.waitForSelector('#wImpOk', { timeout: 8000 });
  const kq = await text('#wImpOk');
  assert.match(kq, /Thêm 1 · Cập nhật 1 · Lỗi 1/);
  assert.match(kq, /Dòng · 行 4/);
  await shot('07-nhap-excel');
  await page.click('#ov [data-act="close"]');
  await page.fill('#wq', 'TEST-201');
  await wait(500);
  assert.equal(await page.locator('#main .row.wire').count(), 1);
  await page.fill('#wq', 'TB1-2');
  await wait(500);
  assert.match(await text('#main .row.wire'), /TEST-101/);
  ok('Nhập bảng dây từ Excel, báo đúng dòng lỗi');

  // 14. File mẫu nhập dây tải về được
  const [dlTpl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="wireTpl"]')]);
  assert.match(dlTpl.suggestedFilename(), /\.xlsx$/);
  ok('Tải file mẫu nhập dây');

  // 14b. v1.6 Tra theo mạch: gõ hàng kẹp ra cả mạch (điểm khớp tô vàng), lọc theo điện áp, gõ số dòng ra tờ nào
  await page.fill('#wq', 'TB23');
  await wait(500);
  assert.equal(await page.locator('#main .card.mach').count(), 1);
  const m1 = page.locator('#main .card.mach').first();
  assert.match(await m1.textContent(), /TEST-PSC JK/);
  assert.match(await m1.textContent(), /TEST-F2 10 A/);
  assert.match(await m1.locator('.st.hit').textContent(), /TB23/);
  assert.match(await m1.locator('.path.ve').textContent(), /TB27/);
  assert.match(await m1.textContent(), /Dây về/);
  await shot('07b-tra-mach');
  await page.fill('#wq', '');
  await wait(400);
  assert.equal(await page.locator('#bangNguon tr[data-act="machView"]').count(), 3);
  await page.click('.chips.ap button[data-ap="48 V"]');
  await wait();
  assert.equal(await page.locator('#bangNguon tr[data-act="machView"]').count(), 1);
  await page.click('.chips.ap button[data-ap=""]');
  await wait();
  await page.click('#bangNguon tr[data-act="machView"]:has-text("TEST-PSB H")');
  await wait();
  assert.match(await text('#ov'), /TEST-J53 chân 1/);
  assert.match(await text('#ov .canlo'), /bản vẽ ghi lẫn/);
  await page.click('#ov [data-act="machOpenDoc"]');
  await page.waitForSelector('#viewer #vFrame');
  await page.click('#viewer [data-act="viewClose"]');
  await page.click('#ov [data-act="close"]');
  await page.fill('#wq', '261');
  await wait(500);
  assert.match(await text('#dtKq'), /Dòng 261 nằm ở tờ 8/);
  assert.match(await text('#dtKq'), /第261行在第8页/);
  await page.click('#dtKq [data-act="dtOpen"]');
  await page.waitForSelector('#viewer #vFrame');
  await page.click('#viewer [data-act="viewClose"]');
  await page.fill('#wq', '367');
  await wait(500);
  assert.match(await text('#main'), /TEST-PSC JK/, 'mạch có điểm đến "→ dòng 367"');
  ok('Tra theo mạch: hàng kẹp → cả đường đi + dây về; lọc điện áp; số dòng → tờ, mở bản vẽ');

  // 14c. Thêm mạch tay, ghi chú điện áp đo cho mạch (ghi chú thường, mã máy = tên mạch)
  await page.fill('#wq', '');
  await wait(400);
  await page.click('[data-act="machNew"]');
  await wait();
  await page.click('#mSave');
  await wait();
  assert.match(await text('.toast'), /tên mạch/);
  await page.fill('#m_ten', 'TEST-PSE Q');
  await page.fill('#m_capCho', 'Gia nhiệt 2');
  await page.fill('#m_dienAp', '48 VDC');
  await page.fill('#m_nguon', 'TEST-PSE đầu ra Q-R');
  await page.fill('#m_cauChi', 'TEST-F5 10 A');
  await page.fill('#m_kepDuong', 'TB26');
  await page.fill('#m_den', 'TEST-J60 chân 1');
  await page.fill('#m_kepAm', 'TB30');
  await page.fill('#m_banVe', 'TEST-BV01');
  await page.click('#mSave');
  await wait(700);
  await page.fill('#wq', 'TB30');
  await wait(500);
  const m2 = page.locator('#main .card.mach', { hasText: 'TEST-PSE Q' });
  assert.match(await m2.textContent(), /加热 2/, '"cấp cho" tự dịch');
  await m2.locator('[data-act="machNote"]').click();
  await wait();
  assert.equal(await page.inputValue('#nMay'), 'TEST-PSE Q');
  assert.match(await page.inputValue('#nTitle'), /Đo TEST-PSE Q/);
  await page.fill('#nBody', 'Đo giữa TB26 và TB30: 47,8 V');
  await page.click('#nSave');
  await wait(700);
  await tab('day');
  await page.fill('#wq', 'TB30');
  await wait(500);
  assert.equal(await page.locator('#main .card.mach', { hasText: 'TEST-PSE Q' }).locator('[data-act="noteView"]').count(), 1, 'ghi chú hiện dưới mạch');
  await page.fill('#wq', '');
  await wait(400);
  ok('Thêm mạch tay, tự dịch; ghi chú điện áp đo gắn với mạch');

  // 14d. Nhập một file 3 trang: Dây điện + Mạch + Dòng → Tờ; trang khác bị bỏ qua; dòng lỗi báo đúng trang
  await page.click('[data-act="wireImport"]');
  await wait();
  await page.setInputFiles('#wImport', join(ROOT, 'tests/fixtures/TEST-nguon.xlsx'));
  await page.waitForSelector('#wImpOk', { timeout: 8000 });
  assert.match(await text('#wImpOk'), /Thêm 1 · Cập nhật 0 · Lỗi 1/);
  assert.match(await text('#wImpMach'), /Mạch: thêm 1 · cập nhật 1/);
  assert.match(await text('#wImpDong'), /Dòng → Tờ: thêm 1 · cập nhật 0/);
  assert.match(await text('#wImpOk'), /Bỏ qua trang跳过工作表: Cách đọc/);
  assert.match(await text('#wImpOk'), /Dòng → Tờ · 行号→图页 — Dòng · 行 3/);
  await page.click('#ov [data-act="close"]');
  await page.fill('#wq', '290');
  await wait(500);
  assert.match(await text('#dtKq'), /tờ 9/);
  await page.fill('#wq', 'TB17');
  await wait(500);
  assert.match(await text('#main .card.mach'), /TEST-PSD I/);
  assert.match(await text('#main .row.wire'), /TEST-801/);
  assert.match(await text('#main .row.wire'), /15 V/);
  await page.fill('#wq', 'TB23');
  await wait(500);
  assert.match(await text('#main .card.mach'), /TEST-F2 8 A/, 'mạch trùng tên được cập nhật');
  await page.fill('#wq', '');
  ok('Nhập file Excel 3 trang (dây, mạch, dòng → tờ) một lần');

  // 15. Tính toán = bảng tính Encoder/Delay/Alignment của nhà cung cấp: nhập đúng các ô xanh của file mẫu,
  //     mọi số phải trùng với số Excel tính ra trong file (DPI 13,75; JA PB2 lẻ 63,97…; DPI mới 74,86 → 348…)
  await tab('tinh');
  await page.click('.chips.plcl button[data-cv="CV23"]');
  await wait();
  const xanh = { encoderPPR: '2500', duongKinh: '120', divider: '49', kheHoPB1: '0', lechPB2: '1.8', daiSP: '190', tocDo: '850', dpiMoi: '74.86', dpiLapTrinh: '1200' };
  for (const [k, v] of Object.entries(xanh)) await page.fill('#t_' + k, v);
  await page.selectOption('#t_soCanh', '4');
  await wait();
  assert.equal(await text('#tDpi'), '13,75');
  assert.equal(await text('#tF'), '1,457 kHz');
  assert.equal(await page.getAttribute('#tStatus', 'data-muc'), 'ok');
  const cot = async (n) => (await page.locator(`#tJA tr[data-ja] td:nth-child(${n})`).allTextContents()).map((v) => v.trim().split(/\s/)[0]);
  assert.deepEqual(await cot(2), ['0', '15', '30', '45', '63', '78', '93', '108'], 'Delays without alignment (N5:N8, Q5:Q8)');
  assert.deepEqual(await cot(3), ['0', '15', '30', '45', '63,97', '78,97', '93,97', '108,97'], 'PB1/PB2 alignment (Q21:Q24, W21:W24)');
  assert.deepEqual(await cot(4), ['0', '15', '30', '45', '64', '79', '94', '109'], 'số nhập máy');
  assert.deepEqual(await page.locator('#tMoi td').allTextContents(), ['0', '82', '163', '245', '348', '430', '512', '593'], 'New DPI (T5:T8, W5:W8)');
  assert.equal(await text('#tFMoi'), '7,933 kHz');
  assert.equal(await text('#tQ14'), '17.810,17');
  // So JA thực tế trên máy với số tính ra: JA7 lệch +2 chấm (đỏ), ghi lại; sửa JA7 rồi lưu lần nữa → khớp
  for (const [i, v] of ['0', '15', '30', '45', '64', '79', '96', '109'].entries()) await page.fill('#t_tt' + i, v);
  await wait();
  assert.equal(await page.getAttribute('#tJA tr[data-ja="7"] td.lech', 'data-d'), '2');
  assert.match(await page.getAttribute('#tJA tr[data-ja="7"] td.lech', 'class'), /bad/);
  assert.match(await text('#tJA tr[data-ja="7"] td.lech'), /\+3,69 mm/);
  assert.match(await text('#tLechSo'), /1 JA/);
  await shot('08-bang-tinh-dau-in');
  await page.fill('#t_ghiChu', 'Thông số ban đầu');
  await page.click('#tSave');
  await wait(800);
  assert.match(await text('#main .tinhh'), /Lệch.*JA7 \+2/);
  assert.match(await text('#main .tinhh'), /初始参数/);
  assert.equal(await page.inputValue('#t_divider'), '49', 'mở lại điền sẵn lần lưu mới nhất');
  await page.fill('#t_tt6', '94');
  await page.click('#tSave');
  await wait(800);
  assert.equal(await page.locator('#main .tinhh').count(), 2);
  assert.match(await page.locator('#main .tinhh').first().textContent(), /khớp số tính ra/);
  // Máy 1 màu chỉ có JA1–4; bảng tra DPI theo divider tô đúng dòng
  await page.click('.chips.plcl button[data-cv="CV01"]');
  await wait();
  assert.equal(await page.locator('.tt-ja input').count(), 4);
  assert.equal(await page.locator('#tJA tr[data-ja]').count(), 4);
  await page.fill('#t_divider', '');
  await wait();
  assert.match(await text('#tKq'), /Divider/);
  await page.fill('#t_divider', '3');
  await page.selectOption('#t_soCanh', '2');
  await page.click('#main details summary');
  await wait();
  assert.equal(await text('#tBangDPI td.hl'), '112,3');
  ok('Tính toán theo đúng bảng tính nhà cung cấp; so JA1–8 thực tế với số tính ra; lưu theo đầu in có lịch sử');

  // 15b. v1.6 Encoder và trục theo chuyền: danh sách báo chuyền chưa nhập, sửa ở form chuyền, Tính toán lấy số của chuyền,
  // lưu bảng tính với trục khác thì chuyền cập nhật theo; nhập sai bị chặn
  await tab('may');
  assert.match(await text('#main .row.line[data-id="CV01"] .enc'), /Encoder 2500 · trục\/辊径 120 mm · Edges 4/);
  assert.match(await text('#main .row.line[data-id="CV16"] .enc'), /Chưa nhập encoder/);
  await page.click('#encBtn');
  await wait();
  assert.equal(await page.locator('#encTbl tr').count(), 10, '9 chuyền + tiêu đề');
  assert.match(await text('#encTbl'), /5000/);
  await page.click('#encTbl button[data-id="CV16"]');
  await wait();
  await page.fill('#lEnc', '0');
  await page.click('#lSave');
  await page.waitForSelector('.toast.bad', { timeout: 5000 });
  assert.match(await text('.toast.bad'), /Encoder resolution/);
  await page.fill('#lEnc', '2500');
  await page.fill('#lTruc', '120,5');
  await page.selectOption('#lCanh', '4');
  await page.fill('#lEncGhi', 'TEST-ENC-16');
  await page.click('#lSave');
  await wait(700);
  assert.match(await text('#lvEnc'), /2500/);
  assert.match(await text('#lvEnc'), /120,5 mm/);
  assert.match(await text('#lvEnc'), /TEST-ENC-16/);
  await page.click('#ov [data-act="close"]');
  await tab('tinh');
  await page.click('.chips.plcl button[data-cv="CV16"]');
  await wait();
  assert.equal(await page.inputValue('#t_encoderPPR'), '2500');
  assert.equal(await page.inputValue('#t_duongKinh'), '120.5', 'Tính toán lấy trục của chuyền');
  assert.match(await text('#tPhanCung'), /trục\/辊径 120,5 mm/);
  await page.fill('#t_duongKinh', '119.8');
  await page.click('#tSave');
  await page.waitForSelector('.toast:has-text("cũng được cập nhật")', { timeout: 5000 });
  await wait(300);
  assert.match(await text('#tPhanCung'), /trục\/辊径 119,8 mm/);
  await tab('may');
  assert.match(await text('#main .row.line[data-id="CV16"] .enc'), /119,8 mm/);
  await page.click('.tabs .tab[data-v="home"]');
  await wait();
  assert.match(await text('.mtile[data-v="may"]'), /1 chuyền chưa có encoder/);
  ok('Encoder và trục lưu theo từng chuyền; Tính toán dùng số của chuyền và cập nhật ngược khi đổi');

  // 16a. Thông số máy: danh sách chuyền có sản phẩm đang chạy
  await tab('may');
  assert.equal(await page.locator('#main .row.line').count(), 9);
  assert.match(await page.locator('#main .row.line[data-id="CV01"]').textContent(), /TEST-SP01/);
  assert.match(await page.locator('#main .row.line[data-id="CV16"]').textContent(), /Chưa chọn sản phẩm/);
  await page.click('.chips button[data-m="2"]');
  await wait();
  assert.equal(await page.locator('#main .row.line').count(), 5);
  await page.click('.chips button[data-m="0"]');
  await wait();
  await shot('11-thong-so-chuyen');
  ok('Thông số: 9 chuyền, lọc 1/2 màu, thấy sản phẩm đang chạy');

  // 16b. Xem thông số máy 2 màu theo màn hình bộ điều khiển: PB1 JA1–4, PB2 JA5–8
  await page.click('#main .row.line[data-id="CV23"]');
  await wait();
  await page.click('#ov .card.spl.on [data-act="tsView"]');
  await wait();
  for (const t of ['Encoders', 'Print Control', 'Form Specification', 'Head Alignments', 'Fire Pulses', 'Pneumatics', 'Heads']) assert.match(await text('#ov'), new RegExp(t));
  assert.match(await page.locator('#ov .scr[data-k="fp"]').textContent(), /JA8/);
  assert.match(await page.locator('#ov .scr[data-k="fs"]').textContent(), /7,48 in/, 'Length = 190 mm đổi ra inch');
  assert.equal(await page.locator('#ov .scr[data-k="hd"] table.pbt th .chip').count(), 2, 'Heads có 2 bình mực PB1/PB2');
  ok('Máy 2 màu: chia theo màn hình bộ điều khiển, PB1/PB2 tách riêng, Length theo dài SP');

  // 16c. Cập nhật: ô sửa tô cam, liệt kê thay đổi, lưu thành lần ghi mới, lịch sử giữ lần cũ
  await page.click('#tsNewBtn');
  await wait();
  assert.equal(await page.locator('#ov .chg').count(), 0);
  await page.fill('#f_volt_4', '104');
  await page.fill('#f_volt_5', '103');
  await page.fill('#f_ghiChu', 'PB2 in mờ, tăng áp');
  await wait();
  assert.equal(await page.locator('#ov input.chg').count(), 2);
  const diff = await text('#f_diff');
  assert.match(diff, /Fire Pulses JA5: 102 → 104/);
  assert.match(diff, /JA6: 101 → 103/);
  await page.fill('#f_volt_2', '');
  await page.click('#tsSave');
  await wait();
  assert.match(await text('.toast'), /ô ở giữa/, 'bỏ trống ô JA ở giữa phải bị chặn');
  await page.fill('#f_volt_2', '99');
  await shot('12-cap-nhat-thong-so');
  await page.click('#tsSave');
  await wait(800);
  assert.equal(await page.locator('#ov .hist').count(), 2);
  assert.match(await page.locator('#ov .hist').first().textContent(), /PB2喷印模糊，提高电压/);
  assert.match(await page.locator('#ov .hist').first().textContent(), /JA5: 102 → 104/);
  assert.match(await page.locator('#ov .scr[data-k="fp"]').textContent(), /104/);
  // Xem lại lần ghi cũ: ô khác lần trước được tô
  await page.locator('#ov .hist').nth(0).locator('[data-act="tsDel"]').waitFor();
  ok('Cập nhật thông số: tô ô sửa, liệt kê thay đổi, lưu lần ghi mới, giữ lịch sử, lý do tự dịch');

  // 16d. Sản phẩm mới cho chuyền 1 màu: chép từ chuyền khác, máy 1 màu chỉ có PB1; chuyển sang chạy SP đó
  await page.click('#ov [data-act="close"]');
  await page.click('.chips button[data-m="9"]');
  await wait();
  await page.click('#fabSP');
  await wait();
  await page.fill('#spMa', 'TEST-SP09');
  await page.fill('#spTen', 'Băng 190 mm');
  await page.fill('#spDai', '190');
  await page.click('#spSave');
  await wait(700);
  assert.match(await text('#ov'), /190毫米卫生巾/);
  await page.click('#ov [data-act="close"]');
  await page.click('.chips button[data-m="0"]');
  await wait();
  await page.click('#main .row.line[data-id="CV16"]');
  await wait();
  await page.click('#lineAddSp');
  await wait();
  await page.selectOption('#addSp', { label: 'TEST-SP09 · Băng 190 mm' });
  await page.click('#addSpOk');
  await wait(700);
  await page.selectOption('#f_chep', 'CV01|SPTEST01');
  await wait();
  assert.equal(await page.inputValue('#f_volt_0'), '98');
  assert.equal(await page.locator('#f_volt_4').count(), 0, 'máy 1 màu không có JA5–8');
  assert.equal(await page.locator('#f_nhietBinh2').count(), 0, 'máy 1 màu không có PB2');
  await page.click('#tsSave');
  await wait(800);
  assert.match(await text('#ov'), /Chép từ Chuyền 01/);
  await page.click('#ov [data-act="lineView"]');
  await wait();
  await page.click('#ov [data-act="runForm"]');
  await wait();
  await page.click('#runSave');
  await wait(700);
  assert.match(await page.locator('#ov .card.spl.on').textContent(), /TEST-SP09/);
  await page.click('#ov [data-act="close"]');
  await wait();
  assert.match(await page.locator('#main .row.line[data-id="CV16"]').textContent(), /TEST-SP09/);
  ok('Sản phẩm mới, gắn vào chuyền, chép thông số từ chuyền khác (máy 1 màu chỉ PB1), chuyển sang chạy');

  // 16e. So sánh các chuyền
  await page.click('[data-act="tsCompare"]');
  await wait();
  assert.match(await text('#tsCmp'), /TEST-SP09/);
  await page.click('#ov [data-act="close"]');
  ok('So sánh thông số các chuyền');

  // 20a. Tab Máy in gom Thông số / Tính toán / Tra dây
  await page.click('.tabs .tab[data-v="mayin"]');
  await wait();
  assert.equal(await page.locator('.seg button').count(), 3);
  assert.match(await text('header.bar h1'), /Máy in/);
  ok('Tab Máy in gom Thông số, Tính toán, Tra dây');

  // 20b. Chương trình: 16 chuyền PLC riêng (khác 9 chuyền máy in); chọn chuyền rồi gõ địa chỉ → ra ngay chú thích
  await tab('ct');
  assert.match(await text('header.bar h1'), /Chương trình/);
  assert.equal(await page.locator('.tabs .tab.on[data-v="them"]').count(), 1);
  assert.equal(await page.locator('.chips.plcl button').count(), 16);
  assert.match(await page.locator('.chips.plcl').textContent(), /01.*02.*03.*04.*09.*10.*15.*21.*23.*06.*08.*12.*17.*18.*16.*13/);
  assert.equal(await page.locator('#psheet').count(), 0, 'không còn ô chọn sheet');
  await page.click('.chips.plcl button[data-cv="PL06"]');
  await page.waitForFunction(() => /4 sheet/.test((document.querySelector('#plcTT') || {}).textContent || ''), null, { timeout: 15000 });
  await page.fill('#pq', 'x1002');
  await wait(600);
  assert.equal(await page.locator('#plcKq .plch').count(), 1, 'chỉ tìm trong chuyền đang chọn');
  const kqPLC = page.locator("#plcKq .plch").first();
  assert.match(await kqPLC.locator('.traloi').textContent(), /X1002 → 粉碎机异常/);
  assert.match(await kqPLC.textContent(), /远程IO · A4/);
  await shot('13-chuong-trinh');
  await kqPLC.locator('[data-act="plcDich"]').click();
  await wait(800);
  assert.match(await kqPLC.locator('.dichkq').textContent(), /Máy nghiền lỗi/);
  await kqPLC.locator('[data-act="plcMo"]').click();
  await wait(600);
  assert.equal(await page.locator('#ov table.plct td.on').textContent(), 'X1002');
  await page.click('#ov [data-act="close"]');
  // Đổi sang chuyền 23: cùng chữ đang gõ, ra kết quả của chuyền 23; chuyền chưa có bảng thì mời tải bảng
  await page.click('.chips.plcl button[data-cv="PL23"]');
  await page.waitForFunction(() => document.querySelectorAll('#plcKq .plch').length === 1, null, { timeout: 15000 });
  assert.match(await text('#plcTT'), /Chuyền 23/);
  await page.click('.chips.plcl button[data-cv="PL01"]');
  await wait();
  assert.match(await text('#plcTT'), /chưa có bảng/);
  assert.equal(await page.isDisabled('#pq'), false, 'chuyền chưa có bảng vẫn gõ được để ghi chú địa chỉ');
  ok('Chương trình: 16 chuyền PLC riêng, chọn chuyền rồi tra địa chỉ ra chú thích, dịch, mở đúng ô');

  // 20b2. Tra đúng tên: M1 chỉ ra ô "M1" (không ra M10, M11, M100…); ghi chú theo địa chỉ có lịch sử
  await page.click('.chips.plcl button[data-cv="PL06"]');
  await page.waitForFunction(() => /4 sheet/.test((document.querySelector('#plcTT') || {}).textContent || ''), null, { timeout: 15000 });
  await page.fill('#pq', 'm1');
  await wait(600);
  const oKhop = await page.locator('#plcKq .plch .cell.on').allTextContents();
  assert.ok(oKhop.length >= 1, 'phải có ô M1');
  assert.ok(oKhop.every((v) => v === 'M1'), 'chỉ ô đúng tên M1, không ra M10/M100: ' + oKhop.join(','));
  assert.match(await text('#plcKq .traloi'), /M1 → 主机停止_1#/);
  await page.click('#gcpAdd');
  await wait();
  await page.fill('#gcpND', 'Đã đổi sang cảm biến mới');
  await page.click('#gcpSave');
  await wait(700);
  assert.match(await text('#plcKq .card.gcp'), /Đã đổi sang cảm biến mới/);
  assert.match(await text('#plcKq .card.gcp'), /已更换为新传感器/);
  await page.click('#gcpEdit');
  await wait();
  assert.equal(await page.inputValue('#gcpND'), 'Đã đổi sang cảm biến mới', 'điền sẵn ghi chú mới nhất');
  await page.fill('#gcpND', 'Thêm nút dừng phụ');
  await page.click('#gcpSave');
  await wait(700);
  assert.match(await text('#plcKq .card.gcp'), /Thêm nút dừng phụ/);
  assert.match(await text('#plcKq .card.gcp'), /Lịch sử: 2 lần/);
  await page.click('#gcpEdit');
  await wait();
  assert.equal(await page.locator('#ov .gcph').count(), 2);
  assert.match(await page.locator('#ov .gcph').nth(1).textContent(), /Đã đổi sang cảm biến mới/);
  await shot('14-ghi-chu-dia-chi');
  await page.click('#ov [data-act="close"]');
  // Địa chỉ không có trong bảng vẫn thêm ghi chú được (địa chỉ mới thêm vào chương trình)
  await page.fill('#pq', 'M5999');
  await wait(600);
  assert.match(await text('#plcKq'), /Không có ô nào đúng tên M5999/);
  assert.equal(await page.locator('#gcpAdd').count(), 1);
  await page.fill('#pq', '');
  await page.click('.chips.plcl button[data-cv="PL01"]');
  await wait();
  ok('Tra đúng tên (M1 không ra M10); ghi chú địa chỉ có lịch sử, tự dịch; địa chỉ mới vẫn ghi chú được');

  // 20c. Tải bảng cho chuyền 01 (file .xlsx thật, nén); file hỏng bị báo trước khi tải lên; thêm chuyền PLC mới
  await page.click('#plcTT [data-act="plcForm"]');
  await wait();
  assert.equal(await page.inputValue('#plcCv'), 'PL01');
  await page.setInputFiles('#plcFile', { name: 'hong.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('khong phai xlsx') });
  await page.click('#plcSave');
  await wait(500);
  assert.match(await text('#plcMsg'), /xlsx/);
  await page.setInputFiles('#plcFile', join(ROOT, 'tests/fixtures/TEST-day.xlsx'));
  await page.click('#plcSave');
  await page.waitForFunction(() => !document.querySelector('#ov'), null, { timeout: 15000 });
  await wait(600);
  assert.equal(await page.locator('.chips.plcl button.on').textContent(), '01');
  await page.fill('#pq', 'TEST-201');
  await wait(600);
  assert.match(await text('#plcKq'), /K1-13/);
  await page.click('[data-act="plcLines"]');
  await wait();
  await page.fill('#plcLineMa', '30');
  await page.click('#plcLineAdd');
  await wait(600);
  await page.click('#ov [data-act="close"]');
  assert.equal(await page.locator('.chips.plcl button').count(), 17);
  ok('Tải bảng chương trình cho chuyền 01; file hỏng bị chặn; thêm chuyền PLC mới');

  // 20d. Ô Tìm chung cũng ra kết quả bảng chương trình
  await tab('tim');
  await page.fill('#q', 'M600');
  await wait(600);
  assert.match(await text('#main'), /Chương trình/);
  assert.ok(await page.locator('#main .plch').count() >= 1);
  await page.fill('#q', '');
  ok('Ô tìm chung có cả kết quả bảng chương trình');

  // 16. Xuất Excel song ngữ
  await page.click('#caiBtn');
  await wait();
  const [dlx] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
  const buf = readFileSync(await dlx.path()).toString('utf8');
  assert.match(dlx.suggestedFilename(), /^Ghi-chu-Tai-lieu_\d{4}-\d{2}-\d{2}\.xlsx$/);
  for (const h of ['Mạch · 回路', 'TEST-PSE Q', 'Hàng kẹp (+) · 端子+', 'Dòng → Tờ · 行号对照', 'Điện áp · 电压', 'Tiêu đề · 标题', 'Tên · 名称', 'Số dây · 线号', 'TEST-201', '高速运行时喷印模糊', 'Thông số hiện tại · 当前参数', 'Fire Pulses', 'Fire Pulses JA8 (V)', 'Head Alignments JA1 (px)', 'TEST-SP09', 'Sản phẩm · 产品']) assert.ok(buf.includes(h), 'Excel thiếu ' + h);
  ok('Xuất Excel song ngữ (ghi chú, tài liệu, dây)');

  // 17. Nhật ký sửa đổi
  await page.click('[data-act="audit"]');
  await wait(600);
  assert.ok(await page.locator('#ov table.t tr').count() > 5);
  await shot('09-nhat-ky');
  await page.click('#ov [data-act="close"]');
  ok('Nhật ký sửa đổi');

  // 18. Đổi PIN: PIN yếu bị chặn, đổi được, đăng nhập lại bằng PIN mới
  await page.click('[data-act="pinChange"]');
  await page.fill('#pCu', '111111');
  await page.fill('#pMoi', '123456');
  await page.click('[data-act="pinSave"]');
  await wait();
  assert.ok(await page.locator('#ov').count() === 1, 'PIN dễ đoán phải bị chặn');
  await page.fill('#pMoi', '274815');
  await page.click('[data-act="pinSave"]');
  await wait(600);
  assert.equal(await page.locator('#ov').count(), 0);
  await page.click('[data-act="logout"]');
  await wait();
  await bamPin('111111');
  assert.match(await text('#lErr'), /PIN/);
  await bamPin('274815');
  await page.waitForSelector('#main');
  ok('Đổi PIN, PIN cũ hết dùng được');

  // 19. Mọi nhãn tab đều song ngữ
  const nhan = await page.locator('.tabs .tab').allTextContents();
  for (const n of nhan) assert.match(n, /[一-鿿]/, 'tab thiếu tiếng Trung: ' + n);
  await shot('10-trang-chu');
  ok('Nhãn song ngữ Việt · 中文');

  assert.deepEqual(errs, [], 'Có lỗi JavaScript:\n' + errs.join('\n'));
  ok('Không có lỗi JavaScript trong console');
  console.log(`\nE2E: ${step} bước đều đạt`);
} catch (e) {
  console.error('✗ Hỏng ở bước', step + 1, '\n', e);
  if (errs.length) console.error('Lỗi JS:', errs.join('\n'));
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'loi.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
