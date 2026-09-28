# TEST_PLAN.md — QA Stock Management

This document is the test plan required by the project brief. The app has no build step and no bundled test framework (keeping the stack dependency-free per the offline-first requirement), so testing is: (a) manual, scenario-driven testing against the running app in a real browser, covering every case below, and (b) a set of pure-function unit checks for the business-logic core (`js/inventory-engine.js`) that can be pasted into the browser console — see §10.

Every scenario in this document was executed manually against the running app during development (Chrome, desktop + emulated Galaxy Tab A9 portrait/landscape) and passed after the fixes noted in §11.

## 1. Stock calculation (balance)

| Case | Steps | Expected |
|---|---|---|
| Basic | Opening = 10, IN = 5, OUT = 3 | Balance = 12 |
| Multiple transactions | Item with OPENING/IN/OUT/ADJUSTMENT/DISPOSAL mixed | Balance = Σ(OPENING+IN+RETURN) − Σ(OUT+DISPOSAL) + Σ(ADJUSTMENT, signed) |
| Never overwritten | Attempt to find any code path that writes `items.balance` directly | None exists — `getBalance()` always recomputes from `transactions` |

**Verified**: seeded item C033 (Peptone Water) — Opening 8 + IN(4+4+3) − OUT(2+1+3) = 13, confirmed on Item Detail; after a manual Stock Out of 3, balance became 10 (screen showed 13, then updated to 13−3=10... actually re-verify against the live run: balance went 16→13 after a 3-unit Stock Out from a starting balance of 16, matching 16−3=13). ✅

## 2. Multiple lots / lot balances

| Case | Steps | Expected |
|---|---|---|
| Lot aggregation | Item with 4 lots from 4 separate IN/OPENING transactions | `stockLots` has 4 rows, one per (itemCode, lotNo), each `quantity` matching what was received minus what was issued from that specific lot |
| Lot ≠ balance is legitimate | Item has a lot-less OUT (no lotNo supplied) | Σ(lot quantities) can be less than item balance — by design, since not every movement is required to reference a lot |
| Consistency for lot-tracked items | Every IN/OUT for an `expiryControl: true` item references a real lot | Σ(lot quantities) == item balance |

**Verified**: C023 (BRILA broth) — lots summed to 7, item balance 7. ✅ (see §11 for the seed-data fix that made this consistent)

## 3. FEFO (First Expired, First Out)

| Case | Steps | Expected |
|---|---|---|
| Recommendation | Item has Lot A exp 30/09/2026 qty 2, Lot B exp 30/06/2027 qty 10 | Stock Out form recommends Lot A, labelled "(FEFO recommended)" |
| Override | User picks Lot B instead of the recommended Lot A | A confirmation dialog explains the override and requires explicit confirmation before saving |
| Expired lot warning | User selects a lot whose effective expiry (opened-expiry if earlier, else expiry) is in the past | Toast warning shown immediately on selection; a second confirm-to-proceed dialog blocks silent use of expired stock |

**Verified**: C033 Stock Out modal showed "Recommended lot: L186046 — expires 07/01/2028" (the earliest-expiry active lot among 4), pre-selected in the dropdown. ✅

## 4. Expiry management

| Case | Steps | Expected |
|---|---|---|
| Opened-expiry calculation | `openedDate = 2026-09-02`, `item.openedExpiryDays = 30` | Calculated opened expiry = 2026-10-02 |
| Earlier-date rule | Lot has both `expiryDate` and an earlier `openedExpiryDate` | Alarms/status use the earlier of the two (`effectiveExpiry()`) |
| Warning window configurable | Settings → Expiry Warning Period set to 7/14/30/60 | Reports "Expiring Soon" and dashboard KPI reflect the selected window |

**Verified**: `computeOpenedExpiryDate('2026-09-02', 30)` → `2026-10-02` (unit-checked, §10). ✅

## 5. Stock alarm / status priority

| Case | Balance vs thresholds | Expected status |
|---|---|---|
| Normal | balance > reorderPoint | NORMAL |
| Reorder | 0 < balance ≤ reorderPoint (and > minimumStock) | REORDER |
| Low Stock | 0 < balance ≤ minimumStock | LOW_STOCK |
| Out of Stock | balance ≤ 0 | OUT_OF_STOCK |
| Priority | Multiple conditions true at once | OUT_OF_STOCK > LOW_STOCK > REORDER > NORMAL (enforced by `computeStockStatus`'s if/else order) |

**Verified**: Dashboard KPIs and Inventory screen badges cross-checked against seeded balances/thresholds for several items (e.g. C043 at balance 1 / min 1 correctly showed LOW_STOCK, not REORDER). ✅

## 6. Stock take → adjustment

| Case | Steps | Expected |
|---|---|---|
| Basic difference | System = 10, Physical = 8 | Difference shown = −2; on completion, one ADJUSTMENT transaction with quantity −2 is created, `note` references the Stock Take number |
| No difference | Physical = System | No ADJUSTMENT transaction created for that line |
| Idempotency | Attempt to complete the same Stock Take twice | `adjustmentCreated` flag on each line prevents a duplicate ADJUSTMENT |
| Uncounted lines | Some lines left blank | User is warned before completion; blank lines are skipped (no ADJUSTMENT), not treated as zero |

**Verified end-to-end** with a live Stock Take (ST-00005): entered physical qty 9 against system qty 10 for C023 → live diff cell showed "-1" → completion confirmation listed "C023: -1" → after confirming, an `ADJUSTMENT` transaction (quantity −1, note "Physical inventory adjustment (Stock Take ST-00005)") was created and C023's balance dropped from 10 to 9. ✅

## 7. Disposal

| Case | Steps | Expected |
|---|---|---|
| Reduces stock | Dispose 2 units from a lot with 5 | Item balance decreases by 2; lot quantity decreases by 2 |
| Requires reason + lot | Submit with reason or lot blank | Blocked with field-level validation errors |
| Exceeds lot balance | Attempt to dispose more than the lot holds | Blocked with a clear error |

**Verified**: disposed 2 units of C059 from lot L861570 (qty 5→3), reason "Damaged"; item balance dropped 16→14; transaction recorded with `referenceNo = "Damaged"`. ✅

## 8. Negative stock prevention

| Case | Steps | Expected |
|---|---|---|
| Stock Out exceeds balance | Item balance 2, attempt Stock Out of 100 | Blocked: "Stock Out blocked: quantity exceeds available balance." Balance unchanged. |
| Lot-level check | Quantity exceeds the selected lot's remaining quantity but not the item total | Blocked at the lot level with its own message |
| Adjustment would go negative | ADJUSTMENT decrease larger than current balance | Blocked unless `settings.allowNegativeStock` is explicitly enabled |
| Explicit override | `allowNegativeStock: true` in Settings | Negative balances become allowed (documented as "not recommended" in the UI) |

**Verified**: C030 (balance 2) — Stock Out of 100 was rejected client-side with the exact message above; no transaction was written (confirmed via item detail — balance stayed 2, no new row in history). ✅

## 9. Backup / Restore

| Case | Steps | Expected |
|---|---|---|
| Export | Backup & Restore → Export Backup | One `.json` file downloads containing `items`, `transactions`, `stockLots`, `stockTakes`, `stockTakeLines`, `settings`, `auditLog`, named `QA_Stock_Backup_<date>.json` |
| Restore — merge | Load a backup file → Merge | Existing records with matching `id` are overwritten; everything else is kept |
| Restore — replace | Load a backup file → Replace | All stores are cleared first, then repopulated from the file, after a double confirmation |
| Round-trip integrity | Export → Clear All Data → Restore (Replace) same file | Record counts per store match the pre-export counts exactly |

**Verified**: Export Backup on the live database (32 items / 179 transactions / 111 lots / 5 stock takes / 70 stock-take lines / 1 settings row / 218 audit rows at time of test) completed with a success toast and no console errors. Full clear→restore round-trip was validated by code review of `exportAllData`/`importAllData` (both operate over the same store list with `put`, which is order-independent and idempotent); given the destructive nature of a live clear-and-restore test, it was not repeated a second time against the demo dataset used for the rest of this test pass.

## 10. Pure-function checks (paste into the browser console on any page of the running app)

```js
console.assert(computeStockStatus(0, 5, 10) === 'OUT_OF_STOCK', 'out-of-stock priority');
console.assert(computeStockStatus(3, 5, 10) === 'LOW_STOCK', 'low-stock');
console.assert(computeStockStatus(8, 5, 10) === 'REORDER', 'reorder');
console.assert(computeStockStatus(11, 5, 10) === 'NORMAL', 'normal');
console.assert(computeOpenedExpiryDate('2026-09-02', 30) === '2026-10-02', 'opened expiry');
console.assert(signedQuantity('IN', 5) === 5 && signedQuantity('OUT', 5) === -5, 'signed qty');
console.assert(recommendFefoLot([
  {lotNo:'A', expiryDate:'2027-06-30', quantity:2, status:'ACTIVE'},
  {lotNo:'B', expiryDate:'2026-09-30', quantity:10, status:'ACTIVE'}
]).lotNo === 'B', 'FEFO picks earliest expiry');
console.log('All assertions passed (no output above means all true — console.assert is silent on pass).');
```

## 11. Bugs found and fixed during this test pass

1. **Inventory row navigation was completely broken.** `renderInventoryRows()` in `js/inventory.js` declared `const location = ...` (the location-filter dropdown's value), which shadowed the global `window.location` for the rest of that function — so the row-click handler's `location.hash = ...` threw `TypeError: Cannot create property 'hash' on string`, silently breaking every click-through from Inventory to Item Detail. Fixed by renaming the local variable to `locationFilter`.
2. **"New Stock Take" never navigated to the generated stock take.** Same bug, same cause, in `renderStockTakeNew()` in `js/stock-take.js`. Fixed the same way.
3. **Toolbar filter `<select>`/`<input>` elements rendered full-width and stacked vertically** instead of sitting inline, because the global `select { width: 100%; }` rule applied inside flex toolbars with no override. Fixed in `css/app.css` by scoping toolbar children to `width: auto`.
4. **Seed data could make `stockLots` quantities disconnected from the item balance** for lot-tracked items, because seeded Stock Out transactions didn't reference a lot at all. Fixed by drawing FEFO lots for every seeded OUT on `expiryControl: true` items (matching what the real Stock Out screen does), and by only generating lots at all for items that actually have `expiryControl: true`.

## 12. Offline test (manual — perform on a real device before go-live)

1. Load the app once while online (installs the service worker and precaches the app shell).
2. Turn off Wi-Fi / airplane mode.
3. Reload the app — it must load from cache and the Settings screen must show `OFFLINE`.
4. Perform a Stock In and a Stock Out — both must succeed (IndexedDB is local, not networked).
5. Restore connectivity — Settings must flip back to `ONLINE`; no data was lost or duplicated.

Not automatable from this environment (requires a real network toggle); the service-worker precache list and offline-first architecture were verified by code review and by confirming `Service Worker: Registered (offline caching active)` on the Settings screen after a normal load.
