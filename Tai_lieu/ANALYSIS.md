# ANALYSIS.md — Legacy System Analysis

Source file analyzed: `QA.F.073 Stock Media management (1).xlsm` (not modified — read-only inspection via OOXML unzip + `oletools.olevba` VBA extraction + `openpyxl` cell/formula dump).

## 1. Workbook structure

| Sheet | Visible? | Purpose |
|---|---|---|
| `MEDIUM STOCK 2023` | visible | Working ledger for **microbiology media**: Import table, Export table, Current Stock summary — all on one sheet, three column zones. |
| `CHEM STOCK` | **hidden** | Same 3-zone layout as above, for **chemicals**. |
| `Nov.2022` | visible | Monthly physical stock-take ("kiểm kê") snapshot for chemicals, Nov 2022. |
| `Oct.2022` | visible | Same, Oct 2022. (One new sheet was manually copied per month — not scalable.) |
| `Master list ` | visible | Chemical master list: code, catalog number, name, hazard label, storage location. |
| `Droplist` | visible | **Media** master list: code, name (VLOOKUP), location, min stock, unit, opened-expiry days, PIC, note. Backs the `Code`/`Name` named ranges used by data-validation dropdowns. |
| `Data` | visible | Code → QC Method → Name lookup table (21 rows), used as the name source for `Droplist` and the Current-Stock zone. |
| `Checklist chemicals cabinet ` | **hidden** | Multiple small physical-checklist tables (by storage cabinet/shelf), each repeating the No/Code/CatalogNo/Name/Hazard/Location header. |

Two hidden sheets (`CHEM STOCK`, `Checklist chemicals cabinet `) are working data the day-to-day user never sees — the visible UI is really just `MEDIUM STOCK 2023` plus the VBA forms.

## 2. VBA project (fully recovered — no obfuscation, no stomping)

Modules: `ThisWorkbook` (empty), `Sheet1`…`Sheet8` (all empty except `Option Explicit`), `Run` (module), `FrmImport` (UserForm), `Frmexport` (UserForm).

```vb
' Run.bas
Sub show()
    FrmImport.show
End Sub
Sub export()
    Frmexport.show
End Sub
```

**FrmImport** (Stock In / "Import chemical or medium"): fields `txtngay` (date, defaults to `Date`), `cmbHC` (item name combo), `txtsoluong` (quantity), `txtlot` (lot no.), `txtexpdate` (expiry date). `CommandButton1_Click`:
- finds `LR` = last used row of **column A** on the **active sheet**
- validates all 5 fields are non-blank (`MsgBox` if not)
- writes `A(LR+1)=date, C(LR+1)=item, D(LR+1)=qty, F(LR+1)=lot, G(LR+1)=expdate` — i.e. it appends directly into the sheet's **Import zone** (columns A–G).

**Frmexport** (Stock Out / "Export chemical or medium"): fields `txtdate`, `cbHC`, `txtSL` (qty), `txtlot`, `txtBy` (issued-by). `CommandButton1_Click` appends `I=date, K=item, L=qty, N=lot, O=by` into the sheet's **Export zone** (columns I–O).

Both forms have a Reset button (clears the numeric/lot fields) and an `Initialize` that stamps today's date. **Neither form specifies which worksheet it targets** — it always writes to whatever sheet is currently active, and neither form checks that the item exists in the master list, checks available balance, prevents negative stock, or picks a lot (no FEFO).

## 3. Business rules recovered from formulas

Both ledger sheets (`MEDIUM STOCK 2023`, `CHEM STOCK`) share one pattern, row 3 header / data from row 4:

- **Import zone** `A:G` — Date, Chem.Code `=VLOOKUP(Name, Droplist!$B$3:$G$27or33, 6, 0)`, Name (typed), Quan., Unit `=VLOOKUP(Name, Droplist!$B$3:$E$27, 4, 0)`, Lot, Exp. Date.
- **Export zone** `I:O` — Date export, Chem.Code (same VLOOKUP pattern keyed on `K` = exported item name), Name, Quan., Unit, Lot, By.
- **Current Stock zone** `Q:W` — Chem.Code (typed), Name `=VLOOKUP(Code, Data!$A$2:$C$21, 3, 0)`, Min stock (typed), Unit, Exp. Date, **`YTD Stock = SUMIF(imported qty where Name=this) - SUMIF(exported qty where Name=this)`**, Comment `=IF(YTD<Min,"Need to Order","")`.

This *is* the balance formula the new system should generalize:
`Balance = Σ(IN quantities matched by item) − Σ(OUT quantities matched by item)`
— confirming the brief's `Opening + IN − OUT + ADJ + RETURN − DISPOSAL` model, generalized to per-item running balance driven off transaction rows rather than a monthly snapshot.

**Monthly stock-take sheets** (`Oct.2022`, `Nov.2022`) encode the stock-take workflow directly:
`F`=opening ("Lượng tồn trước"), `G`=in ("Nhập"), `H`=out ("Xuất"), `I=F+G-H` (system/calculated qty, "Lượng tồn mới"), `J`=min stock, `M`=physical count ("Check thực tế"), `N=M-I` (difference, "Chênh lệch"), plus opened-unit tracking: `Q`=opened unit size, `R`=opened date, `S`=opened expiry date (opened-date + shelf-life, typed manually, not formula-derived). This maps directly onto the brief's Stock Take → systemQuantity/physicalQuantity/difference → ADJUSTMENT workflow, and onto opened-expiry tracking (`openedDate`/`openedExpiryDate`).

## 4. Master data situation (the core defect)

Master/reference data is scattered across **four** places with **two incompatible coding schemes**:

- `Master list ` and `Droplist` use codes like `C023`, `C024`, `C033`… (chemicals and media share this prefix).
- `Checklist chemicals cabinet ` and the monthly stock-take sheets use a *different* scheme, `CHEM.001`, `CHEM.002`, `CHEM.006`… for the same physical chemicals.
- `Data` maps `C0xx` codes to a name and a QC "Method" tag (e.g. `Coliform`, `E.Coli`, `TPC`) but only covers 21 rows — anything outside that range fails.

There is no single source of truth for "what items exist." An item's minimum stock lives in `Droplist` (media) or the stock-take sheet (chemicals, and only for the month it was last typed) — never in one place per item.

## 5. Concrete problems found in the legacy system

1. **Two coding schemes for the same physical items** (`C0xx` vs `CHEM.0xx`) — no way to reliably cross-reference.
2. **VLOOKUP ranges are hard-coded and inconsistent** (`Droplist!$B$3:$G$27` in some formulas, `$B$3:$G$33` in others, `Data!$A$2:$C$21` fixed at 21 rows) — adding a new item past the range silently breaks lookups.
3. **`CHEM STOCK` sheet's own code lookups are broken**: its `B`/`J`/`Q` formulas reference `Droplist!$B$3:$G$27/33`, which is the *media* droplist — there is no chemical droplist — so every chemical code lookup resolves to `#N/A`. This has been broken for the life of the sheet (visible in the dumped data).
4. **A `#REF!` formula exists** (`MEDIUM STOCK 2023!J11`) from a deleted row/column that was never cleaned up — if naively imported, this would poison a `#REF!` string into transaction data.
5. **Balance is computed by matching item *name text*, not code** (`SUMIF($C$4:$D$212, R4, ...)`), so a typo or trailing-space variant of a name (there are several — e.g. `"Nutrient agar for microbiology"` vs any retyped variant) silently splits one item's stock into two untracked balances.
6. **No lot-level balance** — the ledger records lot no. per transaction line but never aggregates remaining quantity *per lot*; there is no way to know how much of lot `VM945463043` is left, only the item total. FEFO is therefore impossible in the current design.
7. **No stock-out validation** — `Frmexport` will happily write an export row for more than is on hand; nothing prevents negative stock, nothing warns about an expired lot.
8. **No transaction ledger persists across months** — every month's stock-take is a hand-copied new sheet (`Oct.2022`, `Nov.2022`, …), so cross-month consumption trend/history requires manually opening each sheet; there's no continuous audit trail.
9. **Stock-take differences are not converted into anything** — `Chênh lệch` (difference) is just displayed; nothing creates a compensating adjustment or feeds the next period's opening balance automatically (it's re-typed).
10. **The Import/Export forms target "whichever sheet is currently active"** — if the user forgets to click the correct tab first (`MEDIUM STOCK 2023` vs `CHEM STOCK`), data is silently appended to the wrong ledger with the wrong column semantics.
11. **Only one threshold exists** (`Min stock`) — no reorder point distinct from minimum, no maximum/target stock, so there's no gradation between "reorder soon" and "critically low."
12. **`CHEM STOCK` is a hidden sheet** — an ordinary user has no visible way to do chemical stock in/out at all through the normal UI; only whoever knows to unhide it (or the macro, which depends on active-sheet state) can use it.
13. **Two item categories (chemical vs. media) are hard-forked into two near-duplicate sheets/forms** rather than one model with a category field — every future field or fix has to be made twice, and already has drifted (Import form has no supplier field on either side; Export form has no purpose/reference field on either side).

## 6. What was and was not recoverable

- **Fully recoverable**: all worksheet cell values and formulas (via OOXML XML + openpyxl), all VBA source code for every module/class/userform (via `oletools.olevba`, no stomping/obfuscation detected — matches the "AutoExec"/"Suspicious: Run" flags, which are false positives from `Sub show()`/`Sub export()` names, not actual shell execution).
- **Not applicable / nothing to recover**: no external data connections, no named macros beyond `Run.show`/`Run.export`, no password protection on VBA project, no macros triggered by `Workbook_Open` (the workbook has no auto-run — the user must invoke the macros manually, e.g. via a button or Alt+F8).
- **Partially recoverable**: UserForm control *layout* (exact pixel positions, tab order beyond what's inferable from field lists) was not extracted — only which controls exist and their event code — since we only need the *workflow*, not a pixel-identical form, this is not a gap for the redesign.

## 7. Mapping: legacy concept → new data model

| Legacy | New model |
|---|---|
| `Master list ` + `Droplist` + `Data` (merged, de-duplicated, single code scheme) | `items` store — one row per physical item regardless of category |
| `MEDIUM STOCK 2023` Import zone row / `CHEM STOCK` Import zone row / `FrmImport` submission | `transactions` row, `type = "IN"` |
| `MEDIUM STOCK 2023` Export zone row / `CHEM STOCK` Export zone row / `Frmexport` submission | `transactions` row, `type = "OUT"` |
| Lot no. + Exp. Date columns (currently unaggregated) | `stockLots` — one row per (item, lot), quantity maintained by replaying transactions |
| `YTD Stock` SUMIF formula | Computed `balance` = SUM(item's transactions' signed quantities), computed on demand from `transactions`, never stored/overwritten directly |
| `Min stock` column | `items.minimumStock` (kept), plus new `reorderPoint` / `maximumStock` (new, not present in legacy — legacy only had one threshold) |
| Monthly stock-take sheets (`Oct.2022`, `Nov.2022`, …) | `stockTakes` + `stockTakeLines`, one stock-take record per event instead of one sheet per month; differences generate real `ADJUSTMENT` transactions |
| `Đơn vị mở` / `Ngày mở` / `HSD sau mở` (opened unit/date/expiry) | `stockLots.openedDate` / `openedExpiryDate`, `items.openedExpiryDays` (config once per item instead of re-typed every month) |
| `Checklist chemicals cabinet ` (physical cabinet checklists) | `items.location` filter on the Inventory screen (a saved filter/view replaces the separate sheet) |
| Chem.Code vs C0xx dual scheme | Single `itemCode`, unique, category (`CHEMICAL` / `MICROBIOLOGY_MEDIA` / …) as a field rather than a separate sheet/prefix |
| `#REF!` / `#N/A` cells | **Not imported.** Any cell value equal to an Excel error string is rejected at import time and written to an exception report, never inserted as data. |

## 8. Sample data seeded from the legacy file

The realistic sample data shipped with the new app (see `js/seed-data.js`) reuses real item names, codes, units, categories, min-stock values, and a representative slice of transaction history taken directly from `Droplist`, `Master list `, `Data`, and the `MEDIUM STOCK 2023` / `CHEM STOCK` ledgers (e.g. `C023 BRILA broth`, `C033 Peptone water (buffered)`, `C038 Plate count agar`, `C049 Cồn 70°`, chemicals like `Methanol`, `Acetonitrile`, `2-Propanol`, `Sodium hydroxide 0.1N`), so the demo reflects the real factory's inventory rather than generic placeholders.

## 9. New architecture (summary — see DATA_MODEL.md for full detail)

Single principle replacing the whole legacy design: **MASTER DATA → TRANSACTION → BALANCE → ALARM → TRACEABILITY.** No sheet is ever written to directly by a form; every stock movement (`OPENING`, `IN`, `OUT`, `ADJUSTMENT`, `RETURN`, `DISPOSAL`) is one immutable row in `transactions`. Balances, lot quantities, and dashboard KPIs are all *derived* from that ledger, never hand-edited — closing the single biggest hole in the legacy system (balances and lookups that silently go wrong and are never re-validated).
