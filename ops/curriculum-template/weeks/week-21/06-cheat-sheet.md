---
type: resource
title: "W21 · Cheat Sheet: Debits and Credits, FI Postings, CO Objects and Reports"
slug: w21-cheat-sheet
topic: Week 21 Reference
subject: career
minutes: 10
description: One-page reference for Week 21 — debit and credit rules, FI structure, document types and posting keys, the main FI postings, CO objects, reports and the close checklist, plus bit and trie templates.
---
# Week 21 cheat sheet

## Debits and credits

`Assets = Liabilities + Equity`. Every document: **total debits = total credits**.

| Increases with a debit | Increases with a credit |
|---|---|
| Assets, expenses | Liabilities, equity, revenue |

## FI structure

| Element | Kaveri |
|---|---|
| Company code | `KV01`, currency INR |
| Chart of accounts | One list of G/L accounts |
| Fiscal year variant | April–March (`V3` in standard settings), periods 1–12 + special periods 13–16 |
| Posting periods | Opened and closed by finance each month |

## Document types and posting keys

| Doc type | Meaning | | Posting key | Meaning |
|---|---|---|---|---|
| `SA` | G/L document | | `40` / `50` | G/L debit / credit |
| `KR` / `KZ` | Supplier invoice / payment | | `31` / `25` | Supplier invoice (Cr) / payment (Dr) |
| `DR` / `DZ` | Customer invoice / payment | | `01` / `15` | Customer invoice (Dr) / payment (Cr) |
| `WE` / `RE` / `RV` | Goods receipt / MM invoice / SD billing | | `21` / `11` | Supplier / customer credit memo |

## Core postings

| Transaction | Debit | Credit | T-code |
|---|---|---|---|
| G/L journal entry (rent) | Rent expense | Bank | `FB50` |
| Supplier invoice (no PO) | Expense | Supplier | `FB60` |
| Outgoing payment | Supplier | Bank | `F-53` / `F110` |
| Customer invoice (no SD) | Customer | Revenue | `FB70` |
| Incoming payment | Bank | Customer | `F-28` |
| Depreciation | Depreciation expense | Accumulated depreciation | depreciation run |

Display a document: `FB03`. Line items: `FBL1N` (suppliers), `FBL5N` (customers), `FBL3N` (G/L). Balances: `FS10N`.

## Universal Journal

Table `ACDOCA`: one line-item table for FI, CO, asset accounting and material ledger. Cost elements are G/L accounts.

## CO objects

| Object | Purpose | Create |
|---|---|---|
| Cost centre | Where costs arise; a manager is responsible | `KS01` |
| Profit centre | Part of the business measured on profit | `KE51` |
| Internal order | Temporary activity; settled at the end | `KO01` |

Primary cost element = P&L account from FI. Secondary = internal CO allocations only. Cost centre line items: `KSB1`.

## Month-end close

Open new period → all documents posted → accruals → depreciation → GR/IR review → FX revaluation → CO allocations and
settlement → reconcile → close old period → report.

## Bits and tries

```python
x ^ x == 0            # XOR cancels pairs
n & (n - 1)           # drop the lowest set bit
bits[i] = bits[i >> 1] + (i & 1)
node = node.children.setdefault(ch, TrieNode())   # trie insert step
```

## This week

| Item | Details |
|---|---|
| **Deliverable** | WB-21 FI/CO Transaction Log: G/L entry, supplier invoice and payment, customer invoice and payment, a cost centre posting and a traced report in `sap-kaveri-case/week-21/` |
| **Practice quiz** | SAP Finance (FI) & Controlling (CO) (untimed, retakes allowed) |
| **Weekly test** | 15 questions on debits and credits, FI structure, AP/AR, CO objects, reporting, bits and tries, 25 minutes |
| **DSA** | Single Number, Number of 1 Bits, Counting Bits, Implement Trie, Design Add and Search Words (plus Pattern Path extras) |
| **Career task** | Aptitude: permutations and combinations, probability, data interpretation |
