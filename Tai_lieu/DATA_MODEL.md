# DATA_MODEL.md — IndexedDB Schema

Database name: `qa_stock_db`. Version-managed via a single `upgradeneeded` handler (the `db.js` section inside `QA_Stock_Management.html` — the app is a single HTML file, see README §Project structure). All stores use `keyPath: "id"`; ids are generated client-side as `crypto.randomUUID()` (transaction/document numbers are a separate, human-readable, sequential field — see below).

## Store: `items`

One row per physical stock item (chemical, media, consumable, lab supply). Replaces `Master list`, `Droplist`, `Data`, and the per-category ledger sheets' item columns.

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | PK |
| `itemCode` | string | **Unique** (unique index). Human code, e.g. `C033`. Enforced in app code (check-before-insert) since IndexedDB unique indexes throw on violation — caught and surfaced as a validation error. |
| `itemName` | string | |
| `category` | enum | `CHEMICAL`\|`MICROBIOLOGY_MEDIA`\|`CONSUMABLE`\|`LAB_SUPPLY`\|`OTHER` |
| `subCategory` | string | free text, optional |
| `unit` | string | e.g. `chai`, `bottle`, `box`, `pack`, `pcs`, `kg`, `L` |
| `location` | string | e.g. `Lab Micro`, `Tủ số 3` |
| `minimumStock` | number | |
| `reorderPoint` | number | new vs legacy (legacy had only min stock) |
| `maximumStock` | number | new vs legacy |
| `defaultSupplier` | string | optional |
| `storageCondition` | string | optional |
| `expiryControl` | boolean | if false, item is exempt from expiry alarms |
| `openedExpiryDays` | number\|null | shelf life after opening, days |
| `PIC` | string | person in charge |
| `note` | string | |
| `active` | boolean | soft-delete flag; deactivated items hidden from pickers, kept for history |
| `createdAt` / `updatedAt` | ISO string | |

Indexes: `itemCode` (unique), `category`, `active`, `location`.

## Store: `transactions`

Append-only ledger. **Never updated or deleted** except via the controlled admin data-reset (out of MVP scope). This is the single source of truth balances are computed from.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `transactionNo` | string | sequential human number, e.g. `TX-000123`, generated from a `settings.counters.transactionSeq` |
| `date` | ISO date (yyyy-mm-dd) | business date, user-entered |
| `timestamp` | ISO datetime | `new Date().toISOString()`, system-set, immutable |
| `type` | enum | `OPENING`\|`IN`\|`OUT`\|`ADJUSTMENT`\|`RETURN`\|`DISPOSAL` |
| `itemCode` | string | FK → items.itemCode |
| `quantity` | number | always stored **positive**; sign is implied by `type` when computing balance (`OPENING/IN/RETURN` add, `OUT/DISPOSAL` subtract, `ADJUSTMENT` can be ± and stores its signed delta directly since it's the one type that legitimately needs both directions) |
| `unit` | string | denormalized snapshot of item's unit at transaction time |
| `lotNo` | string\|null | required when the item has lot tracking (i.e. whenever a lot no. is supplied on IN) |
| `expiryDate` | ISO date\|null | |
| `openedDate` | ISO date\|null | set on the OUT that first opens a lot, or via a dedicated "mark opened" action |
| `openedExpiryDate` | ISO date\|null | computed = `openedDate + item.openedExpiryDays`, stored for audit/history even though it's derivable |
| `supplier` | string | IN only |
| `purpose` | string | OUT only |
| `issuedTo` | string | OUT only |
| `user` | string | who performed the transaction |
| `note` | string | |
| `referenceNo` | string | free-text external reference (PO no., request no., stock-take no., disposal no.) |
| `createdAt` | ISO datetime | |

Indexes: `itemCode`, `type`, `date`, `lotNo`, `transactionNo` (unique), compound `[itemCode+date]` for per-item history queries.

## Store: `stockLots`

Materialized lot balances, **rebuilt/maintained transactionally alongside every transaction write** (not a separate source of truth — it's a derived-but-persisted projection kept in sync for fast FEFO/lot queries, the same way a SQL view might be materialized). Every write to `transactions` that touches a lot updates the matching `stockLots` row (or creates it) in the same IndexedDB transaction.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `itemCode` | string | FK |
| `lotNo` | string | |
| `expiryDate` | ISO date\|null | |
| `openedDate` | ISO date\|null | |
| `openedExpiryDate` | ISO date\|null | |
| `quantity` | number | current remaining quantity in this lot |
| `supplier` | string | |
| `status` | enum | `ACTIVE`\|`EXPIRED`\|`DISPOSED`\|`DEPLETED` — recomputed on every touch: `DEPLETED` if quantity ≤ 0, `DISPOSED` if fully removed via a DISPOSAL transaction, `EXPIRED` if effective expiry date < today, else `ACTIVE` |

Indexes: `itemCode`, compound `[itemCode+lotNo]` (unique per item+lot), `status`, `expiryDate`.

## Store: `stockTakes`

| Field | Type |
|---|---|
| `id` | uuid |
| `stockTakeNo` | string, sequential |
| `date` | ISO date |
| `user` | string |
| `status` | `DRAFT`\|`IN_PROGRESS`\|`COMPLETED` |
| `note` | string |
| `createdAt` / `completedAt` | ISO datetime |

## Store: `stockTakeLines`

| Field | Type |
|---|---|
| `id` | uuid |
| `stockTakeId` | FK → stockTakes.id |
| `itemCode` | FK |
| `systemQuantity` | number, snapshotted balance at line-creation time |
| `physicalQuantity` | number\|null, user-entered |
| `difference` | number = physical − system |
| `note` | string |
| `adjustmentCreated` | boolean — true once the completing step has written the corresponding `ADJUSTMENT` transaction (idempotency guard so completing twice can't double-adjust) |

Index: `stockTakeId`.

## Store: `auditLog`

| Field | Type |
|---|---|
| `id` | uuid |
| `timestamp` | ISO datetime |
| `action` | e.g. `CREATE_ITEM`, `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `DISPOSAL`, `STOCK_TAKE`, `IMPORT`, `RESTORE` |
| `entity` | store name |
| `entityId` | id in that store |
| `user` | string |
| `description` | human-readable summary |

Index: `timestamp`.

## Store: `settings`

Single-row store (`id: "app"`): `appName`, `companySite`, `defaultUser`, `dateFormat`, `lowStockThresholdDays` (n/a, thresholds live on items), `expiryWarningDays` (default 30, configurable set {7,14,30,60}), `theme`, `allowNegativeStock` (bool, default false), `counters: { transactionSeq, stockTakeSeq }`.

## Balance computation (contract, not a stored field)

```
balance(itemCode) =
    Σ quantity   where type IN (OPENING, IN, RETURN)
  − Σ quantity   where type IN (OUT, DISPOSAL)
  + Σ quantity   where type = ADJUSTMENT   (signed)
  for all transactions with that itemCode
```

Implemented as an indexed cursor scan over `transactions` by the `itemCode` index — never a stored/cached column on `items`, so it can never drift from the ledger (this is the direct fix for legacy problem #5, name-matched/driftable balances). For dashboard/inventory-list performance at the 20k-transaction scale, a per-item balance is computed once per screen render and memoized in memory for that render only (never persisted).

## Status priority (Inventory screen, alarms)

```
OUT_OF_STOCK  (balance <= 0)
  > LOW_STOCK   (balance <= minimumStock)
  > REORDER     (balance <= reorderPoint)
  > NORMAL
```

## Relationships

```
items (1) ──< transactions (N)      via itemCode
items (1) ──< stockLots (N)         via itemCode
transactions (N) >── stockLots (1)  via [itemCode+lotNo]  (when lotNo present)
stockTakes (1) ──< stockTakeLines (N) via stockTakeId
stockTakeLines (N) >── items (1)    via itemCode
```

## Why derived, not stored, balances

This is the single architectural decision that fixes the legacy system's core defect (ANALYSIS.md §5.5): the old workbook stored a *formula-computed* balance that could still be silently wrong (name mismatch, broken VLOOKUP range) with no way to audit how it got that way. Here, `transactions` is the only writable source of truth for quantity; everything else (`balance`, `stockLots.quantity`, dashboard KPIs, status badges) is computed from it, so any discrepancy is provably traceable to a specific transaction row.
