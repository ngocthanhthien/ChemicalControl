# CHANGELOG.md

## [Unreleased] — Bỏ quét QR, thêm bộ lọc Khu vực, tìm mặt hàng theo gõ chữ, báo cáo theo kỳ/biểu đồ

Năm điểm hiệu chỉnh theo yêu cầu.

### 0. Bỏ chức năng quét QR code
Gỡ bỏ hoàn toàn module quét QR bằng camera (`qr-scan.js` — 128 dòng), nút "📷 Quét QR" trên thanh trên cùng, và mục hướng dẫn tương ứng. Lý do đã rõ từ lần trước: độ hỗ trợ `BarcodeDetector` không ổn định trên nhiều bản Chrome desktop. **Vẫn giữ nguyên** tính năng tự sinh mã QR cho từng mặt hàng (nút "▦ Mã QR" ở Chi tiết mặt hàng, dùng để in dán lên kệ/tủ) — đây là 2 tính năng độc lập, chỉ bỏ phần quét, không bỏ phần tạo mã.

### 1 + 2. Bộ lọc Nhóm hàng & Khu vực
- Thêm trường mới **`area`** vào Danh mục hàng hóa: Micro Lab / Chem Lab / Senso Lab (tùy chọn, không bắt buộc — mặt hàng cũ chưa gán vẫn hoạt động bình thường, hiển thị "—").
- Bộ lọc **Nhóm hàng** (đã có sẵn) và **Khu vực** (mới) giờ xuất hiện đồng bộ ở: Tồn kho, Danh mục hàng hóa, Giao dịch, tạo phiếu Kiểm kê, và **Báo cáo** (trước đây Báo cáo hoàn toàn không có bộ lọc nào — bộ lọc ở đây áp dụng cho mọi loại báo cáo, kể cả các báo cáo dạng sổ giao dịch, bằng cách lọc theo danh sách mã hàng khớp điều kiện).
- `area` cũng đã được thêm vào: mẫu nhập/xuất Excel Danh mục hàng hóa (`ITEM_CSV_HEADERS`, `ITEM_EXCEL_HEADERS`), và sheet "Danh mục hàng hóa" trong file sao lưu Excel — không bỏ sót đường nào.

### 3. Tìm mặt hàng theo gõ chữ ("gọi nhớ")
Ô chọn mặt hàng ở Nhập kho, Xuất kho, Điều chỉnh, Hủy bỏ — trước đây là `<select>` phải cuộn qua cả danh mục — nay là ô gõ chữ có gợi ý trực tiếp: gõ 1 phần mã hoặc tên (VD "Agar") sẽ lọc và liệt kê ngay các mặt hàng khớp (theo cả mã lẫn tên, không phân biệt hoa/thường) để bấm chọn. Khi mở form từ một mặt hàng cụ thể (VD "Sửa số lượng lô này" từ Chi tiết mặt hàng), ô này tự khóa lại (chỉ đọc) đúng như hành vi `disabled` cũ.

### 4. Báo cáo: theo kỳ Tháng/Quý/Năm + biểu đồ theo mặt hàng
- **Biến động tồn kho theo kỳ** (trước đây "theo tháng" cố định): nay có bộ chọn **Tháng / Quý / Năm**, bảng hiển thị Tồn đầu/Nhập/Xuất/Điều chỉnh/Trả lại/Hủy bỏ và cột mới **Tổng tiêu dùng** (Xuất + Hủy bỏ) cho từng kỳ, kèm dòng **TỔNG CỘNG**. Đổi bộ lọc Nhóm hàng/Khu vực không làm mất lựa chọn Tháng/Quý/Năm đang xem (đã kiểm tra và sửa 1 lỗi nhỏ ở bước này — xem phần Đã kiểm thử).
- **Biểu đồ tiêu thụ theo mặt hàng (theo năm)** — báo cáo hoàn toàn mới: chọn 1 mặt hàng + 1 năm, hiển thị biểu đồ cột (tự vẽ bằng SVG thuần, không dùng thư viện, đúng tinh thần "không CDN" của cả ứng dụng) lượng tiêu thụ (Xuất kho + Hủy bỏ) theo từng tháng trong năm đó, kèm bảng số liệu và tổng cả năm — dùng làm cơ sở tham khảo lập ngân sách hàng năm cho từng mặt hàng.

### Kỹ thuật khác
- `service-worker.js`: cache bump lên `v10`.
- Thêm component dùng chung `itemComboboxHtml`/`wireItemCombobox`/`itemComboboxValue` (components.js) — thay thế `<select>` ở 4 form, đồng thời dùng lại cho ô chọn mặt hàng trong báo cáo biểu đồ.
- Cập nhật tab "Hướng dẫn sử dụng" trong app: thêm mục "📊 Báo cáo" mới, sửa mục Nhập kho (nhắc ô gõ tìm), mục Kiểm kê (nhắc bộ lọc Khu vực).

### Đã kiểm thử
- Gỡ QR scan: sweep toàn bộ 12 màn hình + Chi tiết mặt hàng — không còn tham chiếu `qr-scan`/`BarcodeDetector` nào sót lại, không lỗi console.
- Bộ lọc Khu vực: tạo mặt hàng test gán `area`, xác nhận lưu đúng, lọc đúng trên Tồn kho/Danh mục hàng hóa; xóa mặt hàng test sau khi xong.
- Ô gõ tìm mặt hàng: gõ "Agar" → đúng 7 mặt hàng khớp (kiểm tra qua DOM trực tiếp, không chỉ nhìn màn hình); chọn 1 kết quả → điền đúng mã vào field ẩn, tự động điền Đơn vị tính, hiện đúng yêu cầu "bắt buộc nhập số lô" theo `expiryControl` của mặt hàng đó.
- Báo cáo theo kỳ: chuyển qua lại Tháng/Quý/Năm ra đúng số dòng và đúng tổng; phát hiện lỗi thật khi test thủ công — đổi bộ lọc Nhóm hàng làm bộ chọn kỳ tự nhảy về "Tháng" — đã sửa (giữ trạng thái UI qua `captureReportUiState`) và kiểm tra lại xác nhận hết lỗi.
- Biểu đồ tiêu thụ: xác nhận đúng 12 cột SVG, đổi mặt hàng qua ô gõ tìm cập nhật đúng số liệu, bảng dưới biểu đồ khớp với dữ liệu giao dịch thật.
- Trường `area` mới: round-trip qua sao lưu Excel (ghi → đọc lại) khớp tuyệt đối.
- Sweep lại toàn bộ 12 route + Chi tiết mặt hàng sau tất cả thay đổi — không lỗi console.

## [Unreleased] — Sao lưu bằng file Excel thay vì JSON

Theo yêu cầu: file sao lưu (Sao lưu → "Xuất file sao lưu") giờ là **1 file Excel (.xlsx)** thay vì JSON — vừa dùng để khôi phục dữ liệu, vừa mở trực tiếp bằng Excel để xem/kiểm tra ngay mà không cần công cụ gì khác.

- **8 sheet**: "Thông tin" (tổng quan: tên app, ngày xuất, số bản ghi mỗi loại) + 1 sheet riêng cho mỗi loại dữ liệu — Danh mục hàng hóa, Giao dịch, Lô hàng, Phiếu kiểm kê, Dòng kiểm kê, Cài đặt, Nhật ký thao tác.
- **Định dạng**: dòng tiêu đề in đậm chữ trắng nền teal (đúng màu chủ đạo của app), cột tự giãn theo nội dung, dòng tiêu đề luôn cố định khi cuộn (freeze pane) — áp dụng luôn cho MỌI file Excel xuất ra từ app (Tồn kho, Danh mục hàng hóa, Giao dịch, Báo cáo), không riêng gì file sao lưu.
- **Khôi phục vẫn nhận cả 2 định dạng**: `.xlsx` (chính) và `.json` (file sao lưu cũ từ trước khi đổi vẫn dùng được bình thường) — cùng cách người dùng chọn Gộp/Thay thế như trước, không đổi.
- **An toàn**: nếu tải lên 1 file Excel không phải là file sao lưu của app (VD lỡ chọn nhầm file Xuất Excel của màn Tồn kho), hệ thống từ chối ngay với thông báo rõ ràng, thay vì âm thầm coi đó là "sao lưu rỗng" — tránh trường hợp bấm "Thay thế toàn bộ" với nhầm file sẽ xóa sạch dữ liệu thật.
- Cơ chế đọc/ghi dữ liệu cốt lõi (`exportAllData`/`importAllData`, bảo vệ bộ đếm khi gộp, validate hình dạng file) **không đổi gì cả** — phần Excel chỉ là một lớp chuyển đổi định dạng mới (đọc/ghi đúng hình dạng dữ liệu y hệt JSON cũ), toàn bộ logic khôi phục đã được kiểm thử kỹ từ trước vẫn nguyên vẹn.

**Kỹ thuật**: mở rộng bộ đọc/ghi `.xlsx` tự viết sẵn có (không CDN, không thư viện ngoài) để hỗ trợ nhiều sheet trong 1 workbook + style (font/fill/cột/freeze pane) — trước đó chỉ ghi được 1 sheet không định dạng. Đã sửa luôn 2 chỗ tài liệu trong tab "Hướng dẫn sử dụng" còn ghi sai là CSV/.json (tàn dư từ trước các lần cập nhật trước). `service-worker.js`: cache bump lên `v9`.

**Đã kiểm thử**: dùng `openpyxl` (Python, độc lập với app) đọc lại file thật do app xuất ra — xác nhận đúng 8 sheet, đúng header, đúng style (fill teal, chữ trắng đậm, freeze A2). Kiểm tra round-trip xuất → đọc lại → so khớp từng trường trên toàn bộ dữ liệu thật (32 mặt hàng, 185 giao dịch, 89 lô, 224 audit log...) — khớp tuyệt đối, chỉ khác ở các bản ghi mẫu cũ (tạo trước khi thêm trường `supplierCode`/`supplierCodes`) được chuẩn hóa từ "chưa có trường" thành "trường rỗng" — không ảnh hưởng gì vì mọi nơi trong app đều đọc các trường này qua `|| ''`/`|| []`. Chạy thử khôi phục thật qua `importAllData` (Gộp) từ file Excel vừa xuất — số bản ghi khớp, Kiểm tra tính toàn vẹn dữ liệu báo 0 lỗi. Thử tải lên 1 file Excel không phải sao lưu → bị từ chối đúng như thiết kế. Khôi phục từ file `.json` cũ vẫn hoạt động bình thường (không hồi quy). Xuất Excel ở Danh mục hàng hóa và nhập lại bằng đường dẫn cũ (`xlsxToObjects`) vẫn hoạt động đúng.

## [Unreleased] — Đổi tên file chính

`index.html` → **`QA_Stock_Management.html`** (đặt tên theo đúng tên app thay vì tên mặc định "index"). Cập nhật kèm theo:
- `manifest.json`: `start_url` trỏ sang tên file mới.
- `service-worker.js`: cache bump lên `v8`, precache trỏ sang tên file mới; **bỏ `./` khỏi danh sách precache** — vì server tĩnh không còn tự động phục vụ file này tại địa chỉ gốc (không có `index.html` để làm trang mặc định), cache `./` sẽ chỉ lưu lại trang danh sách thư mục chứ không phải app.
- README.md: cập nhật lệnh chạy — giờ phải mở đúng `http://localhost:8099/QA_Stock_Management.html`, mở địa chỉ gốc sẽ ra danh sách thư mục thay vì app.
- Dọn vài chỗ còn sót đường dẫn `js/...` cũ trong README.md/DATA_MODEL.md (tàn dư từ trước khi gộp file, không ảnh hưởng chức năng, chỉ là tài liệu chưa cập nhật kịp).

Đã kiểm tra: mở đúng URL mới → app tải bình thường, không lỗi console; PWA install vẫn hoạt động (manifest hợp lệ, icon nhúng sẵn).

## [Unreleased] — Phản hồi người dùng: sửa lô/giao dịch, danh sách PIC, mã NCC

Bốn điểm phản hồi từ người dùng thực tế, triển khai sau khi thảo luận và thống nhất phương án trong app (nay đã là 1 file `index.html`).

### 1. Sửa thông tin lô/giao dịch đã lưu (bao gồm bổ sung PO sau)
Trước đây một khi đã lưu, không có cách nào sửa lại số lô/hạn dùng/NCC nhập sai, và số PO buộc phải biết ngay lúc nhập kho. Đã thêm 2 hàm mới trong tầng dữ liệu (`updateLotMetadata`, `updateTransactionMetadata`) theo đúng nguyên tắc: chỉ cho sửa các trường **mô tả** (số lô, hạn dùng, nhà cung cấp, mã NCC, số PO, ghi chú, người thực hiện) — **không** cho sửa số lượng/mặt hàng/loại/ngày, những trường quyết định tồn kho vẫn phải đi qua Điều chỉnh như cũ. Mỗi lần sửa bắt buộc nhập lý do và được ghi vào audit log (giá trị cũ → mới).
- Nút "✏️ Sửa" mới trên từng dòng ở bảng "Thông tin lô hàng" và "Lịch sử giao dịch" (Chi tiết mặt hàng).
- Sửa số lô (đổi tên) sẽ tự đồng bộ sang mọi giao dịch khác đang tham chiếu lô đó, và kiểm tra trùng tên trước khi đổi — tránh tình trạng "Thông tin lô hàng" và "Lịch sử giao dịch" hiển thị hai số lô khác nhau cho cùng một lô thật.
- Nút "🛠 Sửa số lượng" mở sẵn form Điều chỉnh với đúng lô đó — số lượng vẫn phải qua Điều chỉnh có lý do, không bao giờ sửa trực tiếp.
- Số PO (Số tham chiếu) ở Nhập kho giờ ghi rõ "có thể để trống, bổ sung sau" — điền bổ sung bằng nút Sửa ở trên khi có.

### 2. Danh sách người thực hiện & gợi ý mục đích sử dụng
- **Người thực hiện** (Nhập kho, Xuất kho, Điều chỉnh): đổi từ ô gõ tay sang chọn từ danh sách quản lý ở Cài đặt → "Danh sách người thực hiện (PIC)" (thêm/xóa tên), vẫn có lựa chọn "➕ Khác…" để dùng tên chưa có trong danh sách mà không bị chặn thao tác.
- **Mục đích sử dụng** (Xuất kho): giữ ô nhập tự do, thêm gợi ý tự động từ các giá trị đã từng nhập trong lịch sử giao dịch — không cần ai quản lý danh sách riêng.

### 3. Mã hàng theo từng nhà cung cấp
Một hóa chất/môi trường (VD BPW) có thể có mã catalog khác nhau tùy hãng sản xuất (VD Merck: `1.07228.0500`). Đã thêm `item.supplierCodes` — danh sách "NCC — mã sản phẩm — ghi chú" gắn với từng mặt hàng, sửa được ở form Danh mục hàng hóa. Lúc Nhập kho, chọn/nhập mã tương ứng cho lô đang nhập; nếu là cặp NCC+mã mới, tự động thêm vào danh sách của mặt hàng để lần sau chọn nhanh. Tồn kho vẫn tính chung 1 dòng cho mặt hàng, không tách theo NCC.

**Đã kiểm thử qua UI thật** (không chỉ gọi hàm console): điền form Nhập kho với NCC + mã mới → xác nhận mã được học vào danh mục; sửa lô đổi tên + đổi NCC → xác nhận lô và giao dịch liên quan đồng bộ đúng, không lệch; thêm PO bổ sung cho giao dịch cũ; mở form Điều chỉnh từ nút "Sửa số lượng" → xác nhận đúng lô, đúng trạng thái khóa; chạy lại "Kiểm tra tính toàn vẹn dữ liệu" sau toàn bộ thao tác trên → 0 lỗi, cảnh báo còn lại không liên quan đến các thay đổi này. Đã hồi quy 9 màn hình còn lại (Tồn kho, Kiểm kê, Giao dịch, Cảnh báo, Báo cáo, Sao lưu, Hướng dẫn, Cài đặt, Danh mục hàng hóa) — không lỗi console.

`service-worker.js`: cache bump lên `v7` (nội dung `index.html` thay đổi nhiều, đảm bảo PWA đã cài không giữ bản cache cũ).

## [Unreleased] — Gộp thành 1 file HTML duy nhất

Theo yêu cầu: thay vì ~28 file JS + 2 file CSS + `assets/`, toàn bộ app giờ nằm trong 1 file `index.html` (CSS trong `<style>`, JS nối tiếp nhau trong `<script>`, mỗi module vẫn giữ ranh giới rõ bằng comment phân cách). Đây thuần là gộp file, **không đổi kiến trúc lưu trữ**: vẫn chạy qua local server (`python -m http.server`), vẫn dùng IndexedDB + toàn bộ engine sổ cái/giao dịch atomic như trước — không có rủi ro mất tính năng.

- `manifest.json` và `service-worker.js` vẫn là 2 file riêng, không gộp được — đây là yêu cầu bắt buộc của nền tảng trình duyệt (Service Worker phải đăng ký từ một URL `.js` thật; manifest cần fetch được để trình duyệt nhận diện cài đặt PWA), không phải lựa chọn thiết kế.
- Thư mục `assets/` đã xóa — 3 icon được nhúng thẳng vào `manifest.json` và `<head>` của `index.html` dưới dạng data URI (base64).
- `service-worker.js`: cache bump lên `v6`, danh sách precache rút gọn còn đúng 3 mục (`./`, `./index.html`, `./manifest.json`) vì không còn file JS/CSS rời để cache riêng.
- Đã kiểm thử lại toàn bộ sau khi gộp: tải trang lần đầu (modal chọn Demo/Production), nạp dữ liệu mẫu (32 mặt hàng), điều hướng Danh mục hàng hóa/Hướng dẫn sử dụng, xuất Excel, đăng ký Service Worker + precache đúng 3 file — không có lỗi console.
- Đã sao lưu toàn bộ cấu trúc file cũ (multi-file) ra ngoài dự án trước khi xóa, phòng trường hợp cần đối chiếu lại.

## [Unreleased] — Excel import, QR scan fix, PPTX guide

### 1. Excel import (replaces CSV as the primary Master Data import path)
Previously, Excel support was export-only — import stayed CSV-based because reading a real, DEFLATE-compressed `.xlsx` requires implementing DEFLATE decompression, which was deliberately scoped out as too large/risky for the prior pass. Given this was explicitly requested, it's now implemented:
- **`js/inflate.js`** — a hand-written, dependency-free raw DEFLATE (RFC 1951) decompressor: canonical Huffman construction/decoding, fixed and dynamic Huffman blocks, stored blocks, LZ77 back-references.
- **`js/xlsx-reader.js`** — ZIP central-directory parser + OOXML XML parsing (via the browser's native `DOMParser`, no hand-written XML parser) that resolves the first worksheet, reads `sharedStrings.xml` and inline strings, and returns row objects in the exact shape `csvToObjects()` already produced — so no changes were needed to `validateImportRows()`.
- **Master Data** (`js/master-data.js`): "Tải mẫu nhập" now downloads an `.xlsx` template (was `.csv`); the import file input accepts `.xlsx` (primary) and `.csv` (still accepted, auto-detected by extension); `openImportCsvModal` was generalized into `openImportPreviewModal(objects, onSuccess)` so both formats share one preview/validate/confirm flow.

**Verified**, not just written — every claim below was checked against real, independently-generated files, not just round-tripped through this app's own writer:
1. Round-trip through this app's own `XLSX.build()` (uncompressed ZIP, inline strings) — exact field match, including Vietnamese diacritics and punctuation.
2. A `.xlsx` generated by **openpyxl** (a real, independent library) with genuine DEFLATE-compressed entries — decoded correctly, byte-for-byte matching Python `zlib`'s output (compared via SHA-256).
3. A synthetic `.xlsx` built with Python's `zipfile` using `sharedStrings.xml` (the encoding real Microsoft Excel always uses, unlike openpyxl's inline-string default) plus a numeric cell with no shared-string reference — decoded correctly.
4. The actual UI flow: downloaded template → filled via `XLSX.build` → fed through the real file input's handler as a `File` object → preview modal → confirm → item correctly created in the database.

One real bug was caught and fixed *during* this verification, worth recording: an early manual test appeared to show `inflateRaw` failing on the shared-strings fixture. Tracing it down (byte-for-byte SHA-256 comparison between the real file and what had been pasted into the browser console) showed the compressed bytes I'd manually copy-pasted through the chat as a base64 string had been corrupted in transit — the actual algorithm was correct all along. Fixed by testing exclusively against files fetched directly over HTTP from then on, never large binary blobs pasted inline.

### 2. QR scan bug fix ("Chrome PC không được")
Root-caused to two real bugs in `js/qr-scan.js`, both now fixed:
- `getUserMedia({ video: { facingMode: 'environment' } })` used a bare (effectively exact/mandatory) constraint requesting the rear camera. A desktop/laptop only has a front-facing webcam, so this constraint could fail outright instead of just using whatever camera is available. Changed to `{ ideal: 'environment' }` with a plain `{ video: true }` fallback if even that fails.
- `new BarcodeDetector(...)` was constructed with no support check and no try/catch; on a browser that exposes `BarcodeDetector` without QR support (or where construction otherwise throws), this failed with no feedback to the user. Now checks `BarcodeDetector.getSupportedFormats()` for `'qr_code'` first, and wraps construction in try/catch.
- Error messages are now specific (`NotAllowedError` / `NotFoundError` / `NotReadableError` / `OverconstrainedError` / missing API / QR not supported) instead of one generic message, and the manual-entry field auto-focuses so keyboard-only use works immediately.
- Confirmed live: this test environment's Chrome build has no `BarcodeDetector` at all (`'BarcodeDetector' in window` → `false`) — reproducing the user's report exactly. The fix makes that failure mode show a precise, honest message ("thiếu BarcodeDetector API") instead of a silent or confusing failure. **Not fixed, by design:** on browsers that genuinely lack `BarcodeDetector`-with-QR support (a real, documented gap on many desktop Chrome builds — see README), camera scanning will not work; a from-scratch image-based QR decoder was evaluated and deliberately not attempted (see README "Known limitations" for the reasoning). Manual code entry remains the universal fallback.

### 3. PPTX user guide
`QA_Stock_Management_Huong_Dan.pptx` — a 16-slide deck (generated with `pptxgenjs`, teal/mint palette matching the app's own theme, icon-circle motif throughout) covering the same ground as the in-app Hướng dẫn sử dụng tab: operating principle, Demo/Production first run, nav overview, Stock In/Out + FEFO, Adjustment/Disposal, Stock Take, the 5-tier alarm system, QR scanning, Excel import/export, backup/restore/reset (incl. the PIN), the integrity checker, offline/PWA install, and a closing "related documents" slide — plus one dedicated slide (slide 15) mapping every one of the 33 files in `qa-stock-management/` to its purpose, for whoever maintains this codebase next.

Verified: `scripts/office/validate.py` (from the `pptx` skill) reports all structural checks passing (schema, relationships, content types, slide XML); a full `python-pptx` read-back of all 16 slides confirmed every intended piece of text is present and correctly ordered, with no placeholder/lorem-ipsum content. **Not verified: pixel-level visual rendering** — this machine has no LibreOffice/Poppler installed (a large system install, deliberately not performed without being asked), so slide layouts were checked structurally and by careful manual sizing rather than rendered screenshots. If any text turns out to overflow its box when opened in real PowerPoint, it will most likely be in the dense file-list grid on slide 15.

## [Unreleased] — Feature expansion (terminology, alarm, guide, reset PIN, Excel, QR scan)

Six requested improvements, in order.

### 1. Terminology alignment
Field labels moved closer to the requested wording: item name → "Tên hóa chất/hàng hóa" (Item Detail, Master Data form, Stock In/Out item picker), OPENING transaction label → "Tồn ban đầu", Stock In date/quantity → "Ngày nhập"/"Số lượng nhập", Stock Out date/quantity → "Ngày xuất"/"Số lượng xuất".

### 2. Alarm when stock is nearly out (early-warning tier)
Added a 5th, softer tier — **Sắp cần đặt hàng** (Approaching Reorder) — triggered when balance is still above the reorder point but within a configurable % of it (`Settings → Ngưỡng cảnh báo sớm`, default 20%). Kept separate from the 4 canonical statuses (`js/inventory-engine.js`'s `isApproachingReorder()`) so nothing about the existing status contract changed. Surfaced on: Dashboard (new KPI + Action Required entries), Inventory (filter + badge), Alerts (filter), and a live red count badge on the "Cảnh báo" sidebar link (`updateAlarmBadge()`, refreshed after every route render).

### 3. In-app User Guide
New "Hướng dẫn sử dụng" nav tab (`js/guide.js`) — a static, linked-table-of-contents page covering every workflow (general principle, getting started, Stock In/Out + FEFO, Adjustment/Disposal, Stock Take, the alarm system, QR scanning, Excel import/export, backup/restore/reset, the integrity checker, offline/PWA install). No external documentation needed to operate the app.

### 4. Reset data — reviewed and password-gated
"Xóa toàn bộ dữ liệu cục bộ" now requires typing a confirmation PIN (`1234` — a deliberate-action gate against an accidental tap, not real access control; see README) before it runs, and now also forgets the Demo/Production mode decision and reloads the app afterward, so it genuinely restarts as a first install (`bắt đầu app từ đầu`) rather than just emptying the stores. New reusable `promptPassword()` helper in `js/components.js`.

### 5. Excel export / import / template on data screens
- New self-contained `.xlsx` writer (`js/xlsx-writer.js` — hand-built ZIP + OOXML XML, no library, same offline/no-CDN approach as the existing QR encoder). "⭳ Xuất Excel" added to Inventory, Master Data, Transactions, and every Report.
- Master Data gained "📄 Tải mẫu nhập" (downloads a correctly-headed CSV template with one example row).
- Import stays CSV-based deliberately (see README §Known limitations for why real `.xlsx` import was scoped out — DEFLATE decompression is a much larger, riskier build than writing).

### 6. QR scanning reviewed → implemented
QR generation existed; scanning did not. Added `js/qr-scan.js`: camera-based scan via the native `BarcodeDetector` API (getUserMedia + polling `detect()`), reachable from a new "📷 Quét QR" button in the top bar on every screen. Falls back to an always-available manual code-entry field in the same dialog when the API/camera is unsupported or permission is denied. Camera stream is released via a `MutationObserver` on the modal host, so it stops cleanly regardless of which of the several ways the modal can close.

### Also fixed while testing the above
- `openDB()` (`js/db.js`) now clears its cached connection promise on an unexpected `IDBDatabase` close event, instead of leaving every subsequent database call permanently broken with "the database connection is closing." (Found via manual testing, not a normal-operation path — the app itself never closes the connection — but cheap and correct to guard against.)
- Removed a small piece of dead markup in the new password-prompt modal.
- The new 3rd top-bar button ("📷 Quét QR") overflowed the screen width on mobile (375px), pushing "Nhập kho" off-screen and wrapping the page title to two lines. Button labels are now wrapped in `<span class="btn-label">` and hidden below 720px, leaving icon-only top-bar buttons on phones (`index.html`, `css/responsive.css`) — verified on a 375×812 viewport.

## [Unreleased] — Hardening pass (data-integrity & safety)

A code-review-driven pass focused on data-integrity guarantees the app claims but did not fully enforce. No file was fully rewritten; every change below is a scoped edit. See `TEST_RESULTS.md` for verification detail on each item.

### Fixed (Critical)

- **Atomic negative-stock/negative-lot enforcement.** `postTransaction()` (`js/db.js`) now re-checks the current item balance and, when applicable, the current lot quantity **inside the same IndexedDB transaction** as the write, instead of relying on a separate pre-check in each calling screen. Closes a race window (two tabs, a double-click, or any future caller of `postTransaction()` that doesn't re-implement the check) that could previously drive stock negative despite `allowNegativeStock: false`.
- **Demo data no longer silently reseeds after "Clear All Local Data."** Previously, clearing all data and reloading immediately repopulated the sample dataset (`seedIfEmpty()` ran unconditionally on every boot). The app now asks once, per device, whether to start in Demo or Production mode (`js/app.js`, new `localStorage`-backed flag in `js/utils.js`), and never auto-reseeds afterward — including after an explicit data reset.
- **Stock Out no longer allows bypassing lot selection for lot-tracked items.** An item with `expiryControl: true` and active lots now requires an actual lot to be chosen (not "no lot tracking") before a Stock Out can be submitted, closing the gap that let `stockLots` totals silently drift out of sync with the item balance (`js/stock-out.js`).
- **Safe backup restore.** `importAllData()` (`js/db.js`) now validates that a file is actually a QA Stock Management backup before touching the database, and — critically — never lets a `merge` restore regress the `transactionSeq`/`stockTakeSeq` counters (previously, merging an older backup over newer data could roll counters back and cause the next transaction/stock-take number to collide with an existing one, breaking that operation). `js/backup.js`'s restore handlers are now wrapped in try/catch so a rejected import surfaces as a toast instead of failing silently.

### Fixed (Medium)

- Item Detail's Stock Out quick-action button now correctly respects `allowNegativeStock` instead of always disabling at balance ≤ 0 (`js/item-detail.js`).
- CSV item import now rejects non-numeric or negative `minimumStock` / `reorderPoint` / `maximumStock` / `openedExpiryDays` values with a specific per-row error instead of silently coercing them to `0`/`null` (`js/master-data.js`).
- Consumption/coverage statistics for recently-added items no longer get diluted by a fixed 90-day denominator; the window now shrinks to the item's actual history length when shorter (`js/inventory-engine.js`).

### Added

- **Database Integrity Checker** (`js/integrity-checker.js`, surfaced in Settings → "Kiểm tra tính toàn vẹn dữ liệu"). Read-only scan for negative balances/lots, orphaned references, duplicate keys, and lot/balance drift on lot-tracked items.
- **Production / Demo mode** selector on first run, with a manual "load sample data" action retained in Backup for whenever the database is empty, and the current mode shown in Settings.
- Backup files now carry a `_meta.schemaVersion` stamp (`js/db.js`) for future import-compatibility checks.
- `TEST_RESULTS.md` — verification record for this pass.

### Changed

- `service-worker.js` cache bumped to `v2` (new `js/integrity-checker.js` added to the precache list); old `v1` caches are evicted automatically on activate.
- `index.html` — added `js/integrity-checker.js` script include.

### Testing

Manual, in-browser regression covering every flow in `TEST_PLAN.md` plus targeted checks for each fix above (including calls made directly through the console to reach bypass/race scenarios a click can't). Full detail and pass/fail record in `TEST_RESULTS.md`.
