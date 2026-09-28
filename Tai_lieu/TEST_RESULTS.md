# TEST_RESULTS.md — Hardening Pass

Results of the code-review + hardening pass described in `CHANGELOG.md`. Testing was manual, in-browser, against the running app (same methodology as `TEST_PLAN.md`), plus a handful of checks run directly through the browser console to reach code paths a normal click can't (concurrent/bypassed calls, malformed backup files). No source file was fully rewritten — every fix below is a scoped edit to the named function(s).

## Part 3 — Excel import + QR scan fix

### Excel import (`js/inflate.js`, `js/xlsx-reader.js`, `js/master-data.js`)

| Test | Method | Result |
|---|---|---|
| Round-trip via this app's own writer | `XLSX.build()` → `XlsxReader.xlsxToObjects()` | PASS — exact field match incl. Vietnamese diacritics, commas, quotes |
| Real independent writer, DEFLATE-compressed | Generated `.xlsx` via Python **openpyxl**, fetched over HTTP, parsed | PASS — all 6 ZIP entries decompress correctly; item fields match source exactly |
| `sharedStrings.xml` code path (real Excel's default string encoding) | Hand-built `.xlsx` via Python `zipfile` (`ZIP_DEFLATED`) with a shared-strings table + a bare numeric cell | PASS — after fixing a test-transcription bug (see below) |
| Full UI pipeline | Built a filled template with `XLSX.build()`, wrapped as a real `File`, ran it through the actual file-input change handler → preview modal → confirm | PASS — item correctly created in IndexedDB with correct types (numbers as numbers, booleans as booleans) |
| Blank trailing rows | Included an all-empty row in the test file | PASS — correctly filtered out, not imported as an empty item |

**Bug found and fixed during this verification (test infrastructure, not app code):** an early attempt to test the `sharedStrings.xml` code path appeared to show `Inflate.inflateRaw` throwing "mã Huffman không hợp lệ" (invalid Huffman code). Suspecting the DEFLATE implementation, I wrote a faithful Python port of the exact same algorithm and ran it against bytes extracted directly from the real file — it decoded correctly on the first try, immediately pointing away from the algorithm. Comparing SHA-256 hashes of "the real file" vs. "what had been typed into the browser console" confirmed the ~1500-character base64 string had been corrupted somewhere in manual transcription through the conversation (the hashes didn't match at all, despite matching byte *lengths*). Re-running the identical test by having the browser `fetch()` the file directly from the dev server (no manual copy-paste) passed immediately. **Lesson applied for the rest of this session and worth keeping in mind for any future work here: never trust a large binary-as-base64 blob typed inline into a tool call — fetch real files instead.**

### QR scan fix (`js/qr-scan.js`)

| Test | Result |
|---|---|
| `'BarcodeDetector' in window` in this test environment's Chrome | `false` — reproduces the reported "Chrome PC không được" exactly |
| Clicking "Quét QR" with BarcodeDetector absent | Shows the specific message "Trình duyệt này chưa hỗ trợ quét QR bằng camera (thiếu BarcodeDetector API) — vui lòng nhập mã thủ công bên dưới." (previously: same generic message, but the underlying `getUserMedia` facingMode constraint and missing try/catch around `BarcodeDetector` construction were real bugs that would have caused confusing failures even on browsers that *do* support the API) |
| Manual entry fallback | Auto-focused input, typed `C033`, clicked "Đi tới" → navigated straight to the item's detail page | PASS |
| Console errors during the above | None | PASS |

Camera-based scanning itself (the `BarcodeDetector`-present happy path) could not be exercised end-to-end in this headless test environment (no real camera, and this Chrome build lacks the API entirely) — the fixes address the two concrete bugs found by code review (facingMode constraint, missing error handling) and should be spot-checked on a device/browser combination that does expose `BarcodeDetector` with QR support before relying on it in the field.

## Part 2 — Feature expansion (terminology, alarm, guide, reset PIN, Excel, QR scan)

All 6 verified live in-browser (fresh tabs, cleared Service Worker/cache/IndexedDB/localStorage between rounds where a prior round's state could otherwise mask a stale-file issue — this bit us once during testing, see the note at the end).

| # | Item | Verification | Result |
|---|---|---|---|
| 1 | Terminology | Visual check on Item Detail, Master Data form, Stock In/Out forms — labels read "Tên hóa chất/hàng hóa", "Ngày nhập"/"Số lượng nhập", "Ngày xuất"/"Số lượng xuất", "Tồn ban đầu". | PASS |
| 2 | Approaching-reorder alarm | Forced an item (K004, reorderPoint 10) to balance 11 via a direct `postTransaction` call (threshold at default 20% = 12). Dashboard KPI "Sắp cần đặt hàng" showed 1, the item appeared in "Cần xử lý" with the correct balance/threshold text, the sidebar "Cảnh báo" link showed a red "1" badge, `#/alerts` and `#/inventory?status=APPROACHING` both filtered to exactly that item. | PASS |
| 3 | User Guide tab | Navigated to `#/guide` — all 12 sections render, table-of-contents links smooth-scroll to the right section. | PASS |
| 4 | Reset + password | Wrong PIN (`0000`) → rejected via toast, data untouched (still 32 items). Correct PIN (`1234`) → data cleared, app-mode forgotten, page auto-reloaded, first-run Demo/Production modal reappeared exactly as on a fresh install. | PASS (see note below on a false-alarm during this test) |
| 5 | Excel export | `XLSX.build()` output verified structurally in-console (`PK\x03\x04` header, `PK\x05\x06` end-of-central-directory record present). "⭳ Xuất Excel" clicked on Master Data with no console error (real 32-item export). Buttons also present and wired on Inventory, Transactions, and Reports. Master Data "Tải mẫu nhập" downloads a CSV template. | PASS (structural ZIP validation; not opened in a real Excel install as part of this pass) |
| 6 | QR scan | Opened the scan modal in the test environment (no real camera) — correctly showed the "not supported" fallback message with a working manual-entry field; typed `C033`, clicked "Đi tới" → navigated straight to that item's detail page. Camera/`BarcodeDetector` happy path could not be exercised in this headless test environment and should be spot-checked on an actual Android tablet before relying on it in the field. | PASS (fallback path); camera path untested here |

**False alarm caught during Action 4 testing, root-caused and fixed:** mid-testing, `dbCount()`/`clearAllData()` started throwing `InvalidStateError: The database connection is closing` in the long-lived test tab. Traced to the *test script itself* — an earlier diagnostic step had manually called `db.close()` on the cached connection without resetting `db.js`'s internal `_dbPromise`, so every later call kept reusing a dead connection. Confirmed the shipped code was never at fault by reproducing cleanly in a brand-new tab (`clearAllData()` succeeded immediately, 32 → 0 items, no error). Still hardened `openDB()` with an `onclose` handler that resets `_dbPromise`, so a real future occurrence (e.g. a version-change from another tab) self-heals instead of wedging the app — see `CHANGELOG.md`.

## Part 1 — Critical/medium issues

## 1. Critical issues — fixed and verified

### 1.1 Negative-stock / negative-lot enforcement was UI-only, not atomic
**Before:** `stock-out.js` / `adjustment.js` checked balance with `getBalance()` and only then called `postTransaction()` — two separate IndexedDB transactions. A second call in flight before the first committed (two tabs, a double-click, or any future caller that skips the UI check) could both pass and drive stock negative. `disposal.js` and the Stock Take → ADJUSTMENT path had no enforcement at all in the data layer.

**Fix:** `postTransaction()` (`js/db.js`) now re-reads the item's current balance — and, when a lot is involved, the lot's current quantity — **inside the same IndexedDB transaction** as the write, and aborts (throwing before anything is persisted) if the result would go negative and `settings.allowNegativeStock` is false. This is enforced for every caller, not just the ones that remembered to check first.

**Verified:**
```js
// Called directly, bypassing every UI validation path:
await postTransaction({ type: 'OUT', itemCode: 'C033', quantity: <balance>+1000, ... });
// → threw "Không đủ tồn kho cho C033 (hiện có 11, cần trừ 1011)."
// → balance before and after: unchanged (11 → 11)
```
Result: **PASS**.

### 1.2 Demo data silently reseeded after "Clear All Local Data"
**Before:** `bootstrap()` called `seedIfEmpty()` unconditionally on every load; since `Clear All Data` wipes the `items` store, the very next reload treated the database as "empty" and reseeded fake demo data over what the user intended to be a blank production start.

**Fix:** Added a one-time Demo/Production choice (`ensureAppMode()` in `js/app.js`), recorded in `localStorage` — which `Clear All Local Data` does **not** touch — so the decision persists across any IndexedDB reset. Existing installs (items already present) are silently inferred as Production, so nobody upgrading is prompted unexpectedly. A manual "Nạp dữ liệu mẫu (Demo)" action remains available on the Backup screen for anyone who deliberately wants the sample dataset later, but only while the database is actually empty.

**Verified:** Cleared `localStorage` + IndexedDB, reloaded → mode-selection modal appeared. Chose "Bắt đầu trống (Production)" → dashboard showed 0 items, no seeding. Reloaded again → no modal, still 0 items (mode remembered). From Backup, clicked "Nạp dữ liệu mẫu" → 32 items / 184 transactions loaded, mode flipped to Demo, button then correctly disabled ("Đang có 32 mặt hàng…"). Result: **PASS**.

### 1.3 Stock Out let a lot-tracked item bypass lot selection entirely
**Before:** The Stock Out lot `<select>` defaulted to the FEFO-recommended lot, but a user could still submit with "— Không theo dõi lô —" even for an item with `expiryControl: true`, silently breaking the FEFO guarantee and desynchronizing `stockLots` totals from the item balance.

**Fix:** `stock-out.js` now blocks submission with a field-level error when the item is lot-tracked, has at least one active lot, and no lot was selected.

**Verified:** On C033 (lot-tracked, 3 active lots), cleared the lot dropdown to "— Không theo dõi lô —", entered qty 1, submitted → blocked with "Mặt hàng này theo dõi lô — vui lòng chọn số lô để đảm bảo nguyên tắc FEFO." Re-selected the FEFO lot, submitted → succeeded, balance 12 → 11. Result: **PASS**.

### 1.4 Backup restore could silently corrupt the transaction/stock-take counters
**Before:** `importAllData()` blindly `put()`-ed every row from the backup file, including the single `settings` row. Merging an **older** backup on top of a database that had since grown would roll the `transactionSeq`/`stockTakeSeq` counters backward, so the next Stock In/Out or Stock Take would generate a `transactionNo`/`stockTakeNo` that already existed — rejected by the store's unique index, breaking that operation with a confusing error. There was also no validation that an imported file was actually a QA Stock Management backup at all.

**Fix:** `importAllData()` (`js/db.js`) now validates the file's shape before touching anything (`validateBackupShape()` — rejects non-objects, files with no recognizable store, and rows missing `id`), and for `merge` mode takes the **max** of the current and incoming `transactionSeq`/`stockTakeSeq` instead of overwriting. `backup.js`'s Merge/Replace click handlers are now wrapped in try/catch so any rejection surfaces as a toast instead of an unhandled promise rejection.

**Verified:**
```js
await importAllData({ notAStore: [1,2,3] }, 'merge');   // → threw "...không tìm thấy dữ liệu nào khớp..."
await importAllData(null, 'merge');                       // → threw "...không đúng định dạng JSON."
await importAllData({ items: [{ itemCode: 'X' }] }, 'merge'); // → threw "...thiếu id."

// counters before merge: { transactionSeq: 185, stockTakeSeq: 1 }
await importAllData({ settings: [{ id: 'app', counters: { transactionSeq: 1, stockTakeSeq: 1 } }] }, 'merge');
// counters after: { transactionSeq: 185, stockTakeSeq: 1 }  — did not regress
```
Result: **PASS**.

## 2. Medium issues — fixed and verified

| # | Issue | Fix | File | Result |
|---|---|---|---|---|
| M1 | Item Detail's Stock Out button stayed disabled at balance 0 even when an admin had explicitly enabled negative stock, blocking a feature they opted into. | Disabled state now checks `balance <= 0 && !settings.allowNegativeStock`. | `js/item-detail.js` | PASS (code-reviewed; balance-0 case not re-triggered live since demo data has no zero-balance item at time of test) |
| M2 | CSV import silently coerced invalid numeric fields (`minimumStock`, `reorderPoint`, `maximumStock`, `openedExpiryDays`) to `0`/`null` instead of flagging bad source data. | `validateImportRows()` now rejects non-numeric or negative values for those fields with a specific error row. | `js/master-data.js` | PASS (code review; existing valid-row import path re-verified against real data) |
| M3 | Consumption/coverage stats for a recently-added item were diluted by dividing by the full 90-day window even if the item had only existed a few days. | `computeConsumption()` now divides by `min(windowDays, days since the item's earliest transaction)`. | `js/inventory-engine.js` | PASS (code review; existing items with >90 days history show identical output, confirming no regression for the common case) |

## 3. New capabilities

### 3.1 Database Integrity Checker (`js/integrity-checker.js`, wired into Settings)
Read-only pass over `items`, `transactions`, `stockLots`, `stockTakes`, `stockTakeLines`: duplicate item codes, orphaned transactions/lots/stock-take lines, negative balances, negative lot quantities, stale lot status (`ACTIVE`/not-`DEPLETED` on a zero-quantity lot, `ACTIVE` on an actually-expired lot), duplicate transaction numbers, and — for lot-tracked items — a mismatch between the sum of lot quantities and the ledger-derived balance.

**Run against the full demo dataset (32 items / 184 transactions / 88 lots):**
```
✅ Không phát hiện lỗi. 2 cảnh báo cần xem xét.
Cảnh báo  C029  tổng số lượng các lô (6) khác với tồn kho tính từ giao dịch (5)
Cảnh báo  C038  tổng số lượng các lô (18) khác với tồn kho tính từ giao dịch (17)
```
**Expected, not a defect:** both warnings come from the sample Stock Take's `ADJUSTMENT` lines, which — like the real Stock Take screen — are posted at the item level, not against a specific lot (physical counts in this app are taken per item, matching the brief's Stock Take design). The checker is working as intended: it surfaces exactly this kind of legitimate item-level-adjustment-vs-lot-tracking drift for a human to review, rather than hiding it. Zero **errors** (the hard-invariant class: negative stock, orphaned references, duplicate keys) were found.

### 3.2 Production / Demo Mode — see §1.2 above.

### 3.3 Lot enforcement — see §1.3 above.

### 3.4 Atomic transactions — see §1.1 above. Also applies transparently to the Stock Take → Adjustment path and any future caller of `postTransaction()`, since the guard lives in the data layer, not in per-screen form code.

### 3.5 Safe Backup/Restore — see §1.4 above. Backups now also carry a `_meta.schemaVersion` stamp for future compatibility checks.

## 4. Regression check (existing functionality, re-verified after the above changes)

| Flow | Result |
|---|---|
| Stock In (lot-tracked item) | PASS — unchanged behavior |
| Stock Out with FEFO recommendation + override confirmation | PASS |
| Stock Out blocked when exceeding balance | PASS |
| Adjustment (reason required) | PASS |
| Disposal (lot + reason required) | PASS |
| Stock Take → generate → count → complete → Adjustment created | PASS (re-verified via full flow) |
| Item Detail balance/lot table/history reflect new transactions immediately | PASS |
| Backup export → counts match live data | PASS |
| Vietnamese UI strings (previous localization pass) | PASS — untouched by this pass, spot-checked on Dashboard/Backup/Settings screens, no regressions |
| No console errors on a fresh tab/load | PASS |

## 5. Known limitations carried forward

Unchanged from `TEST_PLAN.md` §12 (offline behavior requires a real device network toggle to fully verify) and `README.md`'s "Known limitations" section (no RETURN entry form, no QR camera scanning, no bulk transaction CSV import, no multi-device sync). None of these are affected by this hardening pass.
