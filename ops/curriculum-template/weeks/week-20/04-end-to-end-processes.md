---
type: notes
title: "W20 · S4 · End-to-End Processes, SAP Activate and Consultant Roles"
slug: w20-s4-end-to-end-processes
topic: P2P, O2C & R2R
subject: career
minutes: 35
description: The three end-to-end processes behind most SAP work (Procure-to-Pay, Order-to-Cash, Record-to-Report), the documents each step creates, how projects run with SAP Activate, and what functional and technical consultants do.
---
# End-to-end processes, SAP Activate and consultant roles

Companies do not think in modules. They think in **processes** that start with a need and end with money moving. SAP
consultants are expected to describe a process end to end, including which department does each step and which
document it creates.

## Procure-to-Pay (P2P)

P2P covers everything from "we need stock" to "the supplier has been paid".

| # | Step | Who | Document created | Classic T-code |
|---|---|---|---|---|
| 1 | Identify the need | Stores / planning | Purchase requisition (internal request, no supplier commitment) | `ME51N` |
| 2 | Choose the supplier and order | Purchasing | Purchase order (a legal commitment to the supplier) | `ME21N` |
| 3 | Receive the goods | Stores | Material document (goods receipt) and an accounting document | `MIGO` |
| 4 | Check the supplier's invoice | Accounts payable | Supplier invoice document (invoice verification) | `MIRO` |
| 5 | Pay the supplier | Accounts payable / treasury | Payment document | `F110` (payment run) or `F-53` (manual) |

Step 4 performs the **three-way match**: SAP compares the **purchase order** (what we ordered and at what price), the
**goods receipt** (what actually arrived) and the **invoice** (what the supplier is charging). If they disagree beyond
the allowed tolerance, the invoice is blocked for payment.

## Order-to-Cash (O2C)

O2C covers everything from a customer's question to cash in the bank.

| # | Step | Who | Document created | Classic T-code |
|---|---|---|---|---|
| 1 | Customer asks about products | Sales | Inquiry (optional) | `VA11` |
| 2 | Offer prices and terms | Sales | Quotation (optional, has a validity date) | `VA21` |
| 3 | Customer confirms | Sales | Sales order | `VA01` |
| 4 | Prepare the shipment | Warehouse / shipping | Outbound delivery | `VL01N` |
| 5 | Pick, pack and ship | Warehouse | Post goods issue: material document and accounting document | done from the delivery (`VL02N`) |
| 6 | Bill the customer | Billing | Billing document (invoice) and an accounting document | `VF01` |
| 7 | Receive the money | Accounts receivable | Incoming payment document | `F-28` |

**Pre-sales** documents (inquiry, quotation) do not create any accounting entry. Money first appears in the books at
**post goods issue**, when stock leaves the warehouse.

## Record-to-Report (R2R)

R2R is the finance process that turns all those postings into reliable statements.

1. **Record**: journal entries, plus the automatic postings from P2P and O2C.
2. **Reconcile and adjust**: check subledgers against the G/L, post accruals, depreciation and corrections.
3. **Close**: open the next posting period and close the old one; run period-end tasks.
4. **Report**: trial balance, balance sheet, profit and loss, management reports.

R2R depends on P2P and O2C. A purchase recorded late or a delivery never billed shows up as a wrong number at month end.
You study R2R in detail in Week 21.

## Swim-lane diagrams

A **swim-lane diagram** draws a process as boxes and arrows, with one horizontal lane per department, so it shows both
**the order of steps** and **who is responsible**. Each box should name the step and the SAP document it creates.

```text
              │ Step 1           Step 2            Step 3          Step 4          Step 5
──────────────┼──────────────────────────────────────────────────────────────────────────
Stores        │ [Purchase req.]─────────────────► [Goods receipt]
              │                                    MIGO
Purchasing    │                 [Purchase order]
              │                  ME21N
Accounts      │                                                   [Invoice ver.]─►[Payment]
              │                                                    MIRO            F110
Supplier      │                  (receives PO)    (ships goods)   (sends invoice) (receives ₹)
```

Tips for good diagrams:

- One verb per box: "Create purchase order", not "Purchasing".
- Put the **document** inside or under each box.
- Show decision points as diamonds, for example "Invoice matches PO and GR?" with a "No → blocked" branch.
- Use a tool such as draw.io and export to PNG or PDF.

## SAP Activate: how projects run

**SAP Activate** is SAP's methodology for implementing S/4HANA. It has six phases:

| Phase | Purpose | Typical outputs |
|---|---|---|
| **Discover** | Understand what the solution can do and build the business case | Strategy, trial system exploration |
| **Prepare** | Set up the project: team, plan, governance, systems | Project plan, kick-off |
| **Explore** | Run **fit-to-standard** workshops: show SAP's standard process and record the gaps | Backlog of configuration items and gaps |
| **Realize** | Configure, build extensions, migrate data, test in iterations | Configured system, test results |
| **Deploy** | Final preparation, user training, cutover to the live system | Go-live |
| **Run** | Operate, support and improve the live system | Support processes, continuous improvement |

The key idea is **fit-to-standard**: start from SAP's best-practice processes and change them only where the
business genuinely needs something different. This is the opposite of designing everything from scratch and then
customising the system to match.

## Functional versus technical consultants

| | Functional consultant | Technical consultant |
|---|---|---|
| Focus | Business processes in a module (FI, CO, MM, SD) | Development, integration, system administration |
| Daily work | Runs workshops, writes requirements and configuration, tests processes, trains users | Writes ABAP code, builds interfaces and reports, extends Fiori apps, manages the system |
| Key skills | Business knowledge, configuration, clear documentation and communication | Programming, data models, integration technologies |
| Typical artefacts | Process designs, functional specifications, test scripts | Technical specifications, code, transport requests |

They work as a pair: the functional consultant writes a **functional specification** ("this report must show blocked
invoices by supplier"), and the technical consultant turns it into code. Engineering students often have an advantage
for technical roles and for **techno-functional** roles that need both.

## Lab: draw the P2P and O2C swim-lanes

1. Draw P2P for Kaveri buying 200 ceiling fans. Lanes: stores, purchasing, accounts payable, supplier.
2. Draw O2C for Kaveri selling 50 mixer grinders to a retailer. Lanes: sales, warehouse, billing, accounts
   receivable, customer.
3. In every box write the step, the document and its T-code or Fiori app.
4. Mark the steps that create an accounting entry with a ₹ symbol.
5. Add one decision diamond to each diagram (three-way match for P2P; credit check for O2C).

These become `p2p.png` and `o2c.png` in your weekly build.

## Check yourself

1. Which P2P step performs the three-way match, and what three documents does it compare?
2. In O2C, which step creates the first accounting entry?
3. In which SAP Activate phase do fit-to-standard workshops happen?
