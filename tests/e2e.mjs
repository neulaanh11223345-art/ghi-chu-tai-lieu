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
const tab = async (v) => { await page.click(`.tabs .tab[data-v="${v}"]`); await wait(); };
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

  // 2. Trang Tìm: gõ không dấu ra cả ghi chú, tài liệu, dây
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

  // 15. Máy tính: thông số mẫu → 112,3 dpi, 12,6 kHz đỏ/cam, delay đúng
  await tab('tinh');
  assert.equal(await text('#rDpi'), '112,29');
  assert.match(await text('#rF'), /12,6/);
  assert.equal(await page.getAttribute('#rStatus', 'data-muc'), 'warn');
  const dl = {};
  for (const k of ['PB1-1', 'PB1-2', 'PB1-3', 'PB1-4', 'PB2-1', 'PB2-2', 'PB2-3', 'PB2-4']) dl[k] = Number(await text(`#rDelay td[data-d="${k}"] b`));
  assert.deepEqual(Object.values(dl), [0, 121, 243, 364, 520, 641, 763, 884]);
  assert.equal(await text('#rDivMin'), '10');
  await shot('08-may-tinh-900');
  await page.fill('#cPpm', '500');
  await wait();
  assert.equal(await page.getAttribute('#rStatus', 'data-muc'), 'ok');
  await page.fill('#cEdge', '3');
  await wait();
  assert.match(await text('#cKq'), /1, 2 hoặc 4/);
  await page.fill('#cEdge', '4');
  await page.fill('#cDiv', '10');
  await page.fill('#cPpm', '900');
  await page.fill('#cTen', 'Máy TEST divider 10');
  await page.click('[data-act="cfgSaveNew"]');
  await wait(700);
  assert.equal(await page.locator('#cBo option').count(), 2);
  assert.equal(await page.getAttribute('#rStatus', 'data-muc'), 'ok');
  await page.selectOption('#cBo', { index: 0 });
  await wait();
  assert.equal(await text('#rDpi'), '112,29');
  ok('Tính DPI, tần số (cảnh báo khi vượt 8 kHz), delay tính thẳng, lưu bộ thông số');

  // 16. Xuất Excel song ngữ
  await page.click('#caiBtn');
  await wait();
  const [dlx] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
  const buf = readFileSync(await dlx.path()).toString('utf8');
  assert.match(dlx.suggestedFilename(), /^Ghi-chu-Tai-lieu_\d{4}-\d{2}-\d{2}\.xlsx$/);
  for (const h of ['Tiêu đề · 标题', 'Tên · 名称', 'Số dây · 线号', 'TEST-201', '高速运行时喷印模糊']) assert.ok(buf.includes(h), 'Excel thiếu ' + h);
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
