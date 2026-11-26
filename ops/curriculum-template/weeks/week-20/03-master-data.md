---
type: notes
title: "W20 · S3 · Master Data: Business Partners, Materials and G/L Accounts"
slug: w20-s3-master-data
topic: SAP Master Data
subject: career
minutes: 35
description: The difference between master data and transactional data, the Business Partner model for customers and suppliers, how the material master is organised into views, and what a G/L account record holds.
---
# Master data: business partners, materials and G/L accounts

Every SAP document borrows most of its content from **master data**. If the master data is wrong, every document built
on it is wrong too. Consultants spend a large share of project time on master data for exactly this reason.

## Three kinds of data

| Kind | What it is | Changes | Examples |
|---|---|---|---|
| **Organisational data** | The structure of the company (Session 2) | Almost never | Company code, plant, sales organisation |
| **Master data** | Long-lived records about the things the business deals with | Occasionally | Customer, supplier, material, G/L account, cost centre |
| **Transactional data** | Records of business events, each with a date and a document number | Constantly | Purchase order, goods receipt, sales order, invoice, journal entry |

A quick test: if a record describes **something** (a customer, a product), it is master data. If it records **something
that happened** on a date (an order was placed, goods arrived), it is transactional data.

The relationship is the same as tables in a relational database you designed in Phase 2:

```sql
-- Master data: one row per supplier, reused by many documents
CREATE TABLE supplier (
  supplier_id   VARCHAR(10) PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  payment_terms VARCHAR(4)  NOT NULL      -- e.g. 'N30' = net 30 days
);

-- Transactional data: one row per purchase order, pointing at master data
CREATE TABLE purchase_order (
  po_number   VARCHAR(10) PRIMARY KEY,
  supplier_id VARCHAR(10) NOT NULL REFERENCES supplier(supplier_id),
  po_date     DATE        NOT NULL
);
```

When a buyer creates a purchase order, SAP copies defaults such as payment terms and currency from the supplier record.
Fix the supplier's payment terms once and every new purchase order picks up the change.

## The Business Partner

In S/4HANA, customers and suppliers are both created as a **Business Partner (BP)** using transaction `BP`. Older
systems had separate customer and vendor transactions; in S/4HANA those are redirected to `BP`, and SAP keeps the
customer and supplier records in sync with the business partner behind the scenes.

### Categories and roles

- **Category**: is the partner a **person**, an **organisation** or a **group**? Kaveri's retailers and suppliers are
  organisations.
- **Roles**: what the partner does for you. One business partner can hold several roles.

| BP role (concept) | Adds data for |
|---|---|
| General business partner | Name, address, communication, tax numbers, bank details |
| Customer (financial accounting) | The receivables account in a company code: reconciliation account, payment terms |
| Customer (sales) | Data per sales area: currency, pricing group, shipping conditions, incoterms |
| Supplier (financial accounting) | The payables account in a company code: reconciliation account, payment terms, payment methods |
| Supplier (purchasing) | Data per purchasing organisation: order currency, purchasing terms |

The advantage of one model: if a company both buys from and sells to the same firm, it is **one** business partner with
a customer role and a supplier role, sharing one address.

### Data at different levels

Business partner data is stored at the level where it applies. This pattern repeats across all master data:

```text
General data          → valid everywhere (name, address)
Company code data     → valid for one legal entity (reconciliation account, payment terms)
Sales area data       → valid for one sales area (pricing, shipping)
Purchasing org data   → valid for one purchasing organisation (order currency)
```

## The material master

The **material master** describes every product a company buys, stores or sells. Transactions: `MM01` create, `MM02`
change, `MM03` display.

### Material type

The **material type** controls which views are available and how stock is valued.

| Material type | Meaning | Kaveri example |
|---|---|---|
| `HAWA` trading goods | Bought and resold without processing | Mixer grinders and ceiling fans |
| `FERT` finished product | Produced in-house and sold | Not used: Kaveri does not manufacture |
| `ROH` raw material | Bought and used in production | Not used |

### Views

A material master is split into **views**, each maintained by the department that owns the data and stored at its own
organisational level.

| View | Owned by | Level | Example fields |
|---|---|---|---|
| Basic data | Master data team | Client (all units) | Description, base unit of measure, material group, weight |
| Purchasing | Purchasing | Plant | Purchasing group, order unit |
| Sales | Sales | Sales org + distribution channel | Sales unit, delivering plant, tax classification |
| MRP | Planning | Plant | Reorder point, planned delivery time |
| Storage | Stores | Plant / storage location | Storage conditions |
| Accounting | Finance | Plant (valuation area) | Valuation class, price control, price |

Two accounting fields matter a lot in Week 22:

- **Valuation class**: links the material to the G/L account used for its inventory. This is how a goods receipt
  knows which stock account to post to.
- **Price control**: `S` (standard price, fixed) or `V` (moving average price, recalculated on each receipt). Trading
  goods commonly use moving average.

## G/L accounts

A **G/L (general ledger) account** is a line in the company's accounts: bank, inventory, revenue, salaries. In S/4HANA
you maintain it centrally with `FS00`.

G/L account data is split into two levels:

| Level | Key fields |
|---|---|
| **Chart of accounts** (shared by company codes using it) | Account number, name, account type, account group |
| **Company code** | Currency, whether line items are displayed, field status group, whether postings are only allowed automatically |

Account types you will see:

| Account type | Used for |
|---|---|
| Balance sheet account | Assets, liabilities, equity: bank, inventory, payables |
| P&L statement account (primary costs or revenue) | Expenses and income that also flow to controlling |
| P&L statement account (non-operating) | Income and expenses not relevant to controlling |
| Secondary cost element | Internal allocations inside controlling (Week 21) |

### Reconciliation accounts

Individual supplier and customer balances live in **subledgers**. A **reconciliation account** is a G/L account (for
example "Trade payables – domestic") that is updated automatically whenever any supplier is posted. You cannot post to
a reconciliation account directly. This guarantees the G/L total always equals the sum of the subledger.

```text
Supplier A  ₹1,20,000 ┐
Supplier B  ₹  45,000 ├─► Reconciliation account "Trade payables"  ₹1,65,000
Supplier C  ₹       0 ┘
```

## Lab: display and create master data

1. Display an existing material with `MM03`. Record its material type, base unit, valuation class and price control.
2. Display an existing business partner with `BP`. Note its roles and which data sits in each role.
3. Display a G/L account with `FS00`. Is it a balance sheet or P&L account? Is it a reconciliation account?
4. Create a new business partner (organisation) for one Kaveri retailer with the customer roles, following the
   tutor's field list.
5. Create one trading-goods material, for example a 750 W mixer grinder, with basic data, sales, purchasing and
   accounting views.
6. Screenshot each saved record with its number and add them to your navigation log.

## Check yourself

1. Is a purchase order master data or transactional data? Why?
2. Why can you not post directly to a reconciliation account?
3. Which material master field tells SAP which inventory G/L account a goods receipt should hit?
