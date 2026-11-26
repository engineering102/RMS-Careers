---
type: resource
title: "W20 · Cheat Sheet: ERP, SAP Navigation, Org Units and Core Processes"
slug: w20-cheat-sheet
topic: Week 20 Reference
subject: career
minutes: 10
description: One-page reference for Week 20 — SAP navigation commands, organisational units, master data types, the P2P and O2C document chain, SAP Activate phases and 2-D DP templates.
---
# Week 20 cheat sheet

## ERP in one line

One integrated system and one shared database: each business event is recorded **once** and updates every department.

## Navigation

| Command | Effect |
|---|---|
| `ME21N` in the command field | Open a transaction in the current session |
| `/nXXXX` | Leave the current transaction (unsaved data is lost) and open `XXXX` |
| `/oXXXX` | Open `XXXX` in a new session |
| `/n` | Back to the start screen |
| **F1** / **F4** | Field help / list of allowed values |
| `SU3` | Your own user defaults |

Classic pattern: `01` create · `02` change · `03` display (`MM01`/`MM02`/`MM03`, `VA01`/`VA02`/`VA03`).

## Organisational units

| Unit | Is | Hangs under |
|---|---|---|
| Client | Top level; separate data set | — |
| Company code | Legal entity with its own books | Client |
| Plant | Warehouse / factory | Company code |
| Storage location | Stock area inside a plant | Plant |
| Purchasing organisation | Negotiates with suppliers | Assigned to plants |
| Sales organisation | Sells; owns terms and liability | Company code |
| Distribution channel · Division | Route to customer · product line | With sales org = **sales area** |

## Master data

| Object | Transaction | Key levels |
|---|---|---|
| Business partner (customer, supplier) | `BP` | General · company code · sales area / purchasing org |
| Material | `MM01` / `MM03` | Client (basic) · plant · sales org · valuation area |
| G/L account | `FS00` | Chart of accounts · company code |

Material type `HAWA` = trading goods (Kaveri's mixers and fans). Valuation class → inventory G/L account.

## P2P and O2C

```text
P2P: Purchase requisition → Purchase order → Goods receipt → Invoice verification → Payment
     ME51N                  ME21N            MIGO (₹)        MIRO (₹)               F110 / F-53 (₹)

O2C: Inquiry → Quotation → Sales order → Delivery → Post goods issue → Billing → Incoming payment
     VA11      VA21        VA01          VL01N      (₹)                 VF01 (₹)  F-28 (₹)
```

(₹) = creates an accounting document. Three-way match = PO vs GR vs invoice.

R2R: record → reconcile and adjust → close the period → report.

## SAP Activate

Discover → Prepare → **Explore** (fit-to-standard) → Realize → Deploy → Run.

## DP II templates

```python
# Grid: dp[r][c] = dp[r-1][c] + dp[r][c-1]
# Two strings: match → dp[i-1][j-1] + 1, else max(dp[i-1][j], dp[i][j-1])
# 0/1 knapsack, one row: for w in range(cap, wt - 1, -1): dp[w] = max(dp[w], dp[w - wt] + val)
```

## This week

| Item | Details |
|---|---|
| **Deliverable** | WB-20 Process Maps for Kaveri: org structure, P2P and O2C swim-lanes, master data notes and navigation log in `sap-kaveri-case/week-20/` |
| **Practice quiz** | ERP Concepts & SAP S/4HANA Overview (untimed, retakes allowed) |
| **Weekly test** | 15 questions on ERP, org structure, P2P/O2C documents and 2-D DP, 25 minutes |
| **DSA** | Unique Paths, Longest Common Subsequence, 0/1 Knapsack, Partition Equal Subset Sum, Edit Distance (plus Pattern Path extras) |
| **Career task** | Aptitude: blood relations, directions, syllogisms. Start company research sheets for 5 target recruiters |
