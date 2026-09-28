# QA Stock Management

Progressive Web App (PWA) hoạt động offline-first, dùng để quản lý hóa chất, môi trường vi sinh, vật tư tiêu hao và vật tư phòng lab cho bộ phận QA/An toàn thực phẩm tại nhà máy sản xuất thực phẩm. Được xây dựng để thay thế `QA.F.073 Stock Media management (1).xlsm` — xem [ANALYSIS.md](ANALYSIS.md) để biết chi tiết đầy đủ về hệ thống Excel/VBA cũ và cách logic của nó được ánh xạ sang ứng dụng mới này.

## Nguyên tắc cốt lõi

```
MASTER DATA (Danh mục) → TRANSACTION (Giao dịch) → BALANCE (Tồn kho) → ALARM (Cảnh báo) → TRACEABILITY (Truy xuất nguồn gốc)
```

Tồn kho và số lượng theo lô **không bao giờ được lưu/ghi đè trực tiếp** — luôn được tính toán từ sổ cái `transactions` (`OPENING`, `IN`, `OUT`, `ADJUSTMENT`, `RETURN`, `DISPOSAL`). Xem [DATA_MODEL.md](DATA_MODEL.md) để biết đầy đủ cấu trúc dữ liệu IndexedDB.

## Tính năng

- **Tổng quan (Dashboard)** — các thẻ KPI (tổng số mặt hàng, theo danh mục, tồn thấp, hết hàng, sắp cần đặt hàng, sắp hết hạn, đã hết hạn) và danh sách cảnh báo "Cần xử lý"
- **Tồn kho (Inventory)** — danh sách có thể tìm kiếm/lọc theo **Nhóm hàng**, **Khu vực** (Micro Lab / Chem Lab / Senso Lab), vị trí, trạng thái, hạn dùng, kèm chức năng xuất Excel; cùng bộ lọc Nhóm hàng/Khu vực cũng có ở Danh mục hàng hóa, Giao dịch, tạo phiếu Kiểm kê, và Báo cáo
- **Nhập kho / Xuất kho (Stock In / Stock Out)** — màn hình riêng và hộp thoại thao tác nhanh; ô chọn mặt hàng hỗ trợ **gõ để tìm nhanh** (VD gõ "Agar" hiện ngay các mặt hàng khớp) thay vì cuộn qua cả danh mục; có ghi nhận lô/hạn dùng, nhà cung cấp/mã hàng của NCC/mục đích/số tham chiếu (PO — có thể để trống, bổ sung sau), kèm kiểm tra dữ liệu đầy đủ; Xuất kho bắt buộc chọn đúng lô cho mọi mặt hàng có kiểm soát hạn dùng (không được bỏ qua nguyên tắc FEFO); Người thực hiện chọn từ danh sách PIC quản lý ở Cài đặt (vẫn có "➕ Khác…"), Mục đích sử dụng gợi ý tự động từ lịch sử
- **FEFO** — gợi ý lô hàng theo nguyên tắc Hết hạn trước – Xuất trước (First-Expired-First-Out) ở mỗi lần xuất kho, có bước xác nhận nếu người dùng chọn khác với gợi ý
- **Kiểm kê (Stock Take)** — tạo phiếu đếm từ tồn kho hiện tại, nhập số đếm thực tế, xem chênh lệch và xác nhận — chỉ tạo giao dịch `ADJUSTMENT` cho những dòng thực sự có chênh lệch
- **Điều chỉnh / Hủy bỏ (Adjustment / Disposal)** — quy trình có kiểm soát, cả hai đều bắt buộc nhập lý do; Hủy bỏ bắt buộc chọn đúng lô hàng
- **Sửa thông tin lô/giao dịch đã lưu** — số lô, hạn dùng, nhà cung cấp, mã NCC, số PO, ghi chú, người thực hiện đều sửa lại được sau khi đã lưu (bắt buộc nêu lý do, có audit log); số lượng vẫn luôn phải qua Điều chỉnh, không bao giờ sửa trực tiếp — xem [DATA_MODEL.md](DATA_MODEL.md)
- **Mã hàng theo nhà cung cấp** — một mặt hàng (VD BPW) có thể lưu nhiều mã catalog khác nhau tùy hãng sản xuất, chọn nhanh lúc Nhập kho, tự học mã mới; tồn kho vẫn tính chung 1 dòng, không tách theo NCC
- **Chi tiết mặt hàng (Item Detail)** — thông tin đầy đủ về một mặt hàng: thông tin cơ bản, phân tích tồn kho + mức tiêu thụ, bảng lô hàng, lịch sử giao dịch, mã QR, các thao tác nhanh
- **Cảnh báo tồn kho (Alarm)** — hệ thống cảnh báo 4 mức (Hết hàng → Tồn thấp → Cần đặt hàng → **Sắp cần đặt hàng**, một mức cảnh báo sớm ở một tỷ lệ % có thể tùy chỉnh phía trên ngưỡng đặt hàng), hiển thị ở Tổng quan, Tồn kho, Cảnh báo, và dưới dạng số đếm trực tiếp trên mục menu "Cảnh báo"
- **Mã QR** — tự sinh mã cho mỗi mặt hàng (xem ở Chi tiết mặt hàng), dùng để in dán lên kệ/tủ nhận diện nhanh (không còn tính năng quét bằng camera — đã gỡ bỏ do độ hỗ trợ trình duyệt không ổn định, xem CHANGELOG.md)
- **Lịch sử giao dịch (Transaction History)** — sổ giao dịch có thể lọc (theo khoảng ngày, loại giao dịch, danh mục, từ khóa) kèm xuất CSV và Excel
- **Danh mục hàng hóa (Master Data)** — CRUD đầy đủ, mã hàng không trùng lặp, mỗi mặt hàng có thể gán **Nhóm hàng** và **Khu vực** (Micro Lab / Chem Lab / Senso Lab), nhập dữ liệu Excel (xem trước/kiểm tra lỗi/báo lỗi) + tải mẫu nhập Excel (vẫn chấp nhận `.csv`), cùng chức năng xuất CSV/JSON/Excel
- **Báo cáo (Reports)** — 12 loại báo cáo, lọc chung theo Nhóm hàng/Khu vực: tồn kho hiện tại, tồn thấp, đã hết hạn, sắp hết hạn, nhập/xuất kho, mức tiêu thụ theo mặt hàng/danh mục, chênh lệch kiểm kê, hủy bỏ (xuất CSV/Excel + in trực tiếp), cùng 2 báo cáo có điều khiển tương tác: **Biến động tồn kho theo kỳ** (chọn xem theo Tháng/Quý/Năm, có tổng Nhập/Xuất/Tiêu dùng theo từng kỳ) và **Biểu đồ tiêu thụ theo mặt hàng theo năm** (chọn 1 mặt hàng + năm, xem biểu đồ cột tiêu thụ theo tháng — cơ sở tham khảo lập ngân sách)
- **Xuất Excel** — mọi màn hình dữ liệu (Tồn kho, Danh mục hàng hóa, Giao dịch, Báo cáo) đều có thể xuất ra file `.xlsx` thật (tiêu đề in đậm, cột tự giãn, freeze dòng đầu), thông qua một trình ghi tự viết nhỏ gọn hỗ trợ nhiều sheet (không dùng thư viện ngoài, không CDN)
- **Sao lưu & Khôi phục (Backup & Restore)** — xuất toàn bộ database ra 1 file Excel (.xlsx) nhiều sheet, có định dạng (tiêu đề in đậm, cột tự giãn, freeze dòng đầu) — vừa dùng để khôi phục, vừa mở trực tiếp bằng Excel để xem/kiểm tra ngay; khôi phục theo kiểu gộp (merge — bộ đếm được bảo vệ, không bị lùi số) hoặc thay thế (replace), có kiểm tra định dạng file; file `.json` từ bản cũ vẫn khôi phục được
- **Chế độ Demo / Production** — được hỏi 1 lần duy nhất trên mỗi thiết bị khi chạy lần đầu; không bao giờ tự động nạp lại dữ liệu mẫu, kể cả sau khi reset dữ liệu
- **Reset dữ liệu (có mã PIN)** — xóa vĩnh viễn toàn bộ dữ liệu cục bộ và khởi động lại ứng dụng như một lần cài đặt mới, yêu cầu nhập mã PIN xác nhận (`1234`) để tránh thao tác nhầm
- **Kiểm tra tính toàn vẹn dữ liệu (Database Integrity Checker)** — quét chỉ đọc (trong Cài đặt) để phát hiện tồn kho âm, dữ liệu mồ côi, khóa trùng lặp, và lệch số lượng giữa lô hàng/tồn kho
- **Hướng dẫn sử dụng (User Guide)** — một tab "Hướng dẫn sử dụng" ngay trong ứng dụng, bao quát mọi quy trình, không cần tài liệu ngoài để vận hành
- **Cảnh báo (Alerts)** — màn hình riêng, có thể lọc, tổng hợp toàn bộ nội dung trong mục "Cần xử lý"
- **Cài đặt (Settings)** — tên ứng dụng/địa điểm, người dùng mặc định, cửa sổ cảnh báo hạn dùng, % cảnh báo sớm, chính sách cho phép tồn âm, chế độ hiện tại, kiểm tra tính toàn vẹn dữ liệu
- **PWA hoạt động offline-first** — Service Worker lưu sẵn (precache) toàn bộ ứng dụng, hoạt động không cần mạng sau lần tải đầu tiên, có thể cài vào màn hình chính/desktop, có chỉ báo trạng thái online/offline ngay trên sidebar

## Cấu trúc thư mục dự án

Kể từ bản gộp file, toàn bộ giao diện, CSS và logic nằm chung trong **1 file `QA_Stock_Management.html`** (dùng thẻ `<style>`/`<script>`, không còn thư mục `css/`, `js/`, `assets/` riêng — icon được nhúng thẳng dưới dạng data URI). Chỉ còn 2 file phụ trợ **bắt buộc phải tách riêng** vì đó là yêu cầu của chính nền tảng trình duyệt, không phải lựa chọn thiết kế:

```
qa-stock-management/
├── QA_Stock_Management.html   toàn bộ HTML + CSS + JS (~28 module JS được nối lại theo đúng thứ tự phụ thuộc, mỗi module có comment phân cách rõ ràng, VD /* ====== db.js ====== */)
├── manifest.json                khai báo PWA — PHẢI là file riêng để trình duyệt nhận diện & cho cài đặt app (icon đã nhúng base64 bên trong, không có file ảnh rời)
├── service-worker.js            cache offline — PHẢI là file .js riêng, trình duyệt không cho đăng ký Service Worker kiểu nhúng inline
└── Tai_lieu/                     tài liệu (README, ANALYSIS, DATA_MODEL, TEST_PLAN, TEST_RESULTS, CHANGELOG, PPTX hướng dẫn)
```

Bên trong `QA_Stock_Management.html`, phần `<script>` vẫn giữ nguyên ranh giới từng module cũ (utils, db, inventory-engine, seed-data, integrity-checker, xlsx-writer, inflate, xlsx-reader, qr, qr-scan, components, các màn hình dashboard/inventory/item-detail/stock-in/stock-out/adjustment/disposal/stock-take/master-data/transactions/alerts/reports/backup/settings/guide, router, app) — chỉ khác là dán nối tiếp nhau thay vì file riêng, để dễ tìm/sửa từng phần khi cần.

## Chạy ứng dụng cục bộ

Không cần bước build, không cần cài thư viện. Bất kỳ static file server nào cũng chạy được — không thể mở ứng dụng qua `file://` vì cả IndexedDB và Service Worker đều yêu cầu origin dạng HTTP(S).

```bash
cd qa-stock-management
python -m http.server 8099
```

Sau đó mở `http://localhost:8099/QA_Stock_Management.html` bằng Chrome (trên máy tính hoặc máy tính bảng Android) — **mở đúng tên file này**, không phải chỉ `http://localhost:8099` (vì file không còn tên `index.html`, trình duyệt sẽ hiển thị danh sách thư mục thay vì ứng dụng nếu chỉ mở địa chỉ gốc). Lần tải đầu tiên sẽ tự động hỏi có muốn nạp dữ liệu mẫu thực tế hay không (xem mục "Dữ liệu mẫu" bên dưới).

## Cài đặt như một PWA

- **Chrome trên máy tính**: bấm biểu tượng cài đặt trên thanh địa chỉ, hoặc vào menu → "Install QA Stock Management…"
- **Máy tính bảng Android (kể cả Samsung Galaxy Tab A9)**: menu Chrome → "Add to Home screen" / "Install app"

Sau khi cài đặt, ứng dụng mở ra như một app độc lập (không còn khung trình duyệt) và tiếp tục hoạt động đầy đủ ở chế độ offline sau lần tải thành công đầu tiên.

## Dữ liệu mẫu

Lần chạy đầu tiên sẽ hỏi có muốn nạp ~32 mặt hàng mẫu thực tế hay không (hóa chất, môi trường vi sinh, vật tư tiêu hao, vật tư phòng lab — lấy trực tiếp từ tên/mã hàng/đơn vị tính thật trong file Excel gốc), kèm khoảng 150 ngày lịch sử giao dịch, nhiều lô hàng cho mỗi mặt hàng với số lượng nhất quán theo nguyên tắc FEFO, và một phiếu Kiểm kê mẫu đã hoàn tất — hay bắt đầu hoàn toàn trống. Để nạp lại dữ liệu mẫu sau này, vào **Sao lưu → Xóa toàn bộ dữ liệu cục bộ** (mã PIN `1234`) — thao tác này cũng sẽ xóa luôn lựa chọn chế độ Demo/Production trước đó, nên màn hình hỏi lần đầu sẽ xuất hiện lại — hoặc, khi database đang trống, vào **Sao lưu → Nạp dữ liệu mẫu (Demo)**.

## Giới hạn hiện tại (MVP)

- **Giao dịch loại RETURN** đã có trong tầng dữ liệu và engine tính tồn kho, nhưng chưa có màn hình nhập liệu riêng (có thể tạm dùng Điều chỉnh kèm ghi chú); một thao tác nhanh "Trả hàng" là hướng phát triển tự nhiên tiếp theo.
- **Nhập/Xuất/Mẫu nhập Excel** (Danh mục hàng hóa) đã hỗ trợ trọn vẹn file `.xlsx` thật hai chiều: phần `xlsx-writer` ghi các mục ZIP không nén, còn `inflate` + `xlsx-reader` tự cài đặt việc giải nén DEFLATE + phân tích ZIP central-directory/XML OOXML (đều là các module bên trong `QA_Stock_Management.html`), nên một file đã được người dùng chỉnh sửa và lưu lại bằng Excel thật (luôn nén dữ liệu) vẫn đọc lại đúng. File `.csv` vẫn được chấp nhận khi nhập, dành cho ai quen dùng CSV hơn. Chỉ Danh mục hàng hóa có chức năng nhập; các màn hình khác chỉ hỗ trợ xuất (Excel + CSV).
- **Mã PIN Reset (`1234`) chỉ là lớp xác nhận, không phải bảo mật thật** — đây là mã trong code phía trình duyệt, ai đọc được mã nguồn cũng thấy được. Mục đích của nó là ngăn thao tác chạm nhầm mang tính phá hủy, không phải để giới hạn quyền reset thiết bị.
- **Không có xác thực đăng nhập (authentication).** Theo đúng yêu cầu ban đầu, đây là công cụ nội bộ của QA — các trường người thực hiện/PIC và nhật ký thao tác đã đủ đảm bảo khả năng truy vết mà không gây phiền phức khi đăng nhập. Bất kỳ ai có quyền truy cập thiết bị đều có thể thực hiện mọi thao tác.
- **Chưa hỗ trợ nhập CSV hàng loạt cho giao dịch** (chỉ Danh mục hàng hóa hỗ trợ nhập hàng loạt); sổ giao dịch được thiết kế để hình thành từ các thao tác Nhập kho/Xuất kho/Điều chỉnh/Hủy bỏ thực tế, đúng theo nguyên tắc "giao dịch là nguồn dữ liệu gốc duy nhất".
- **Không đồng bộ đa thiết bị (Multi-device sync)** — nằm ngoài phạm vi hiện tại; IndexedDB của mỗi lần cài đặt chỉ tồn tại cục bộ trên trình duyệt/thiết bị đó. Dùng chức năng Sao lưu/Khôi phục để chuyển dữ liệu giữa các thiết bị.
- **Bố cục khi in** dùng chức năng in gốc của trình duyệt (`window.print()` kèm stylesheet riêng cho in ấn) thay vì một bộ dựng PDF chuyên dụng — đủ dùng để in khổ A4 từ Chrome, nhưng không phải là PDF chuẩn từng pixel.

## Đề xuất phát triển giai đoạn tiếp theo

1. Một quy trình Trả hàng (Return) riêng biệt (theo mẫu form của Nhập kho) để hoàn thiện đúng với mô hình dữ liệu đã có.
2. Nhập CSV hàng loạt cho giao dịch (theo cùng mô hình xem trước/kiểm tra lỗi/báo lỗi đã xây dựng cho Danh mục hàng hóa).
3. Thông báo đẩy (push notification) cho cảnh báo tồn thấp/sắp hết hạn thông qua Service Worker hỗ trợ background sync (cần thêm một cơ chế lập lịch cục bộ nhẹ, vì ứng dụng không có backend).
4. Đồng bộ đa thiết bị (ví dụ: một backend nhẹ tùy chọn, hoặc một lớp đồng bộ peer-to-peer) nếu bộ phận phát triển vượt quá quy mô sử dụng trên một thiết bị.
5. Phân quyền theo vai trò nếu về sau bộ phận cần giới hạn ai được thực hiện hủy bỏ/điều chỉnh so với chỉ được xem báo cáo, và một lớp xác thực reset dữ liệu phía máy chủ (thay vì mã PIN phía client) nếu điều đó trở thành yêu cầu kiểm soát truy cập thực sự.

## Tài liệu liên quan

- [ANALYSIS.md](ANALYSIS.md) — phân tích hệ thống Excel/VBA cũ, các quy tắc nghiệp vụ đã khôi phục, các vấn đề phát hiện được, và cách ánh xạ từ Excel sang mô hình mới
- [DATA_MODEL.md](DATA_MODEL.md) — cấu trúc dữ liệu IndexedDB đầy đủ, các chỉ mục (index), và nguyên tắc tính toán tồn kho
- [TEST_PLAN.md](TEST_PLAN.md) — các kịch bản kiểm thử (kèm kết quả thực tế từ quá trình kiểm thử thủ công trong lúc phát triển) và các kiểm tra hàm thuần qua console
