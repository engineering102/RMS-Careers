---
type: resource
title: "W22 · Cheat Sheet: P2P, O2C, Integration Postings and Mini Project 5"
slug: w22-cheat-sheet
topic: Week 22 Reference
subject: career
minutes: 10
description: One-page reference for Week 22 — the P2P and O2C document chains with T-codes and postings, account determination keys, document flow, the MP5 checklist, certification pointers and the mock contest plan.
---
# Week 22 cheat sheet

## Procure-to-Pay

| Step | T-code | Accounting entry |
|---|---|---|
| Purchase requisition | `ME51N` | none |
| Purchase order | `ME21N` (display `ME23N`, PO history tab) | none |
| Goods receipt (movement type `101`) | `MIGO` | Dr Inventory (`BSX`) / Cr GR/IR (`WRX`) |
| Invoice verification (three-way match) | `MIRO` | Dr GR/IR / Cr Supplier (payables) |
| Payment | `F110` / `F-53` | Dr Supplier / Cr Bank |

## Order-to-Cash

| Step | T-code | Accounting entry |
|---|---|---|
| Inquiry · Quotation | `VA11` · `VA21` | none |
| Sales order (pricing, availability, credit check) | `VA01` | none |
| Outbound delivery (picking) | `VL01N` | none |
| Post goods issue (movement type `601`) | from the delivery (`VL02N`) | Dr COGS (`GBB`) / Cr Inventory (`BSX`) |
| Billing | `VF01` | Dr Customer (receivables) / Cr Revenue (`ERL`) |
| Incoming payment | `F-28` | Dr Bank / Cr Customer |

## Integration

- **MM account determination** (`OBYC`): transaction key + valuation class → G/L account.
- **SD revenue account determination** (`VKOA`): sales org + account assignment groups + account key → G/L account.
- **GR/IR**: credit balance = goods received, not yet invoiced; debit balance = invoiced, not yet received.
- **Document flow**: `VA03` → display document flow. PO history: `ME23N`.
- Reports: `ME2N` POs · `MB51` material documents · `MMBE` stock · `VA05` sales orders · `FBL3N` / `FBL5N` line items.

## Pricing

Condition technique: pricing procedure → condition types (`PR00` base price, discounts, freight, tax) → condition
records, searched from most specific to most general.

## MP5 checklist

- [ ] Org structure with codes and a diagram
- [ ] Master data tables or screenshots
- [ ] P2P: every step with document number, owner and entry
- [ ] O2C: every step with document number, owner and entry
- [ ] Integration: document flow + MM–FI / SD–FI postings table
- [ ] One page of risks and SAP controls
- [ ] Certification path checked on learning.sap.com
- [ ] DOCX committed per section; PDF exported; 5-minute talk rehearsed

## Mock contest plan (90 minutes)

Read all four (8 min) → easiest first → second → third (brute force if stuck) → final 10 minutes on edge cases.

## This week

| Item | Details |
|---|---|
| **Deliverable** | Mini Project 5: SAP End-to-End Process Document for Kaveri (`sap-kaveri-case/week-22/`), presented in S4 |
| **Practice quiz** | SAP Materials Management (MM) & Sales and Distribution (SD) — SAP Mini Project (untimed, retakes allowed) |
| **Phase 5 test** | 30 questions covering Weeks 20–22, 45 minutes |
| **DSA** | Unlabelled revision set (Valid Sudoku, Find the Duplicate Number, Rotate Image, Spiral Matrix, Copy List with Random Pointer, Count Good Nodes, Palindromic Substrings, Merge Triplets) and the 90-minute mock contest |
| **Career task** | Aptitude: full-length timed mock test #1 |
