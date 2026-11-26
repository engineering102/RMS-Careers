---
type: notes
title: "W20 · S1 · ERP Concepts and the SAP S/4HANA Landscape"
slug: w20-s1-erp-concepts-sap-landscape
topic: ERP Concepts & SAP Overview
subject: career
minutes: 30
description: What an ERP system is and why companies run on one, the business functions it covers, how SAP moved from R/3 to S/4HANA, what the HANA in-memory database changes, and the three deployment options.
---
# ERP concepts and the SAP S/4HANA landscape

For the next three weeks you switch from building software to understanding the software that runs most large
businesses. Even if you plan to be a developer, knowing how an order turns into an invoice and a ledger entry makes you
far more useful in any company that sells or buys things.

## The problem ERP solves

Picture a growing company where every department keeps its own records:

- **Purchasing** keeps supplier orders in a spreadsheet.
- **Stores** keeps a stock register.
- **Sales** keeps customer orders in another tool.
- **Accounts** re-types invoices into an accounting package.

Every hand-off is a chance to make a mistake. The same customer exists three times with three spellings. Stores does
not know a purchase order was placed. Accounts finds out about a sale two weeks later. At month end, people spend days
**reconciling**: checking that the numbers in one system match the numbers in another.

An **ERP (Enterprise Resource Planning)** system replaces these islands with **one integrated system and one shared
database**. A business event is recorded once, and every department sees the effect immediately.

| Without ERP | With ERP |
|---|---|
| Data entered several times in different tools | Data entered once, at the source |
| Each department has its own customer list | One customer record shared by sales and finance |
| Stock and accounts disagree until someone reconciles | A goods movement updates stock and the ledger together |
| Reports are assembled by hand from exports | Reports read the same live data |
| Process rules live in people's heads | Process rules are configured in the system |

The key idea is **integration**. When stores records that 100 mixers arrived, the ERP updates the stock quantity,
the stock value in the balance sheet and the purchase order history in one step.

You can see the idea in miniature with SQL. With one shared database, "how many mixers do we have and what are they
worth?" is one query, not a reconciliation exercise:

```sql
-- One table of goods movements, written by stores, read by finance
CREATE TABLE goods_movement (
  id        INTEGER PRIMARY KEY,
  material  VARCHAR(20) NOT NULL,
  qty       INTEGER     NOT NULL,      -- positive = receipt, negative = issue
  value_inr NUMERIC(12, 2) NOT NULL
);

INSERT INTO goods_movement VALUES
  (1, 'MIXER-750W', 100, 250000.00),
  (2, 'MIXER-750W', -30, -75000.00);

SELECT material, SUM(qty) AS stock_qty, SUM(value_inr) AS stock_value
FROM goods_movement
GROUP BY material;
-- MIXER-750W | 70 | 175000.00
```

## Business functions an ERP covers

An ERP is organised into **modules**, one per business function, all sharing the same data.

| Business function | What it does | SAP area (common abbreviation) |
|---|---|---|
| Financial accounting | Ledgers, supplier and customer accounts, assets, statutory reports | FI |
| Management accounting | Costs by department, product or project; profitability | CO |
| Procurement and inventory | Buying, receiving goods, managing stock | MM (Materials Management) |
| Sales and distribution | Quotations, orders, deliveries, billing | SD |
| Production | Bills of material, production orders, planning | PP |
| Quality | Inspections and quality notifications | QM |
| Maintenance | Equipment and maintenance orders | PM |
| Warehousing | Bins, picking, putaway | EWM |
| People | Employee data and payroll (often a separate cloud product today) | HCM / SuccessFactors |

In this phase you study **FI, CO, MM and SD**: the core that almost every SAP customer uses.

## A short history of SAP

SAP is a German software company founded in 1972. Knowing the product names helps you read job descriptions.

| Generation | What changed |
|---|---|
| **R/2** | Mainframe-based integrated business software |
| **R/3** (1990s) | Client–server architecture; the product that made SAP the standard in large enterprises |
| **SAP ERP / ECC** (ERP Central Component) | R/3's successor, running on any major database (Oracle, SQL Server, DB2 and others) |
| **SAP S/4HANA** (from 2015) | Rewritten to run only on the SAP HANA database, with a simplified data model and the Fiori user experience |

SAP has announced an end date for mainstream maintenance of ECC, which is why many companies are now running
**migration projects** from ECC to S/4HANA. That migration work is a large part of the SAP job market.

## What SAP HANA changes

**SAP HANA** is SAP's own database. Two design choices matter for you:

1. **In-memory**: the working data is held in RAM, not read from disk for every query, so reads are much faster.
2. **Column store**: data is stored column by column rather than row by row. Adding up one column across millions of
   rows (total sales, total stock value) touches only that column, and similar values in a column compress well.

A small Python picture of row versus column layout:

```python
# Row store: each record kept together (good for reading or writing one whole order)
rows = [
    {"order": 1, "customer": "Sharma Electricals", "amount": 12000},
    {"order": 2, "customer": "Lakshmi Traders", "amount": 8500},
    {"order": 3, "customer": "Sharma Electricals", "amount": 4300},
]
print(sum(r["amount"] for r in rows))   # must visit every whole record

# Column store: each field kept together (good for totals over one field)
columns = {
    "order": [1, 2, 3],
    "customer": ["Sharma Electricals", "Lakshmi Traders", "Sharma Electricals"],
    "amount": [12000, 8500, 4300],
}
print(sum(columns["amount"]))           # reads only the amount column
```

Both lines print `24800`; the difference is how much data the database has to read to get there.

Because totals can be computed quickly from line items, S/4HANA **removed many aggregate and index tables** that ECC
needed. The most important result is the **Universal Journal** (table `ACDOCA`), one line-item table for financial and
management accounting. You meet it properly in Week 21.

## Deployment options

| Option | Who runs the system | Typical fit |
|---|---|---|
| **On-premise** | The customer, in its own data centre (or on infrastructure it rents), with full control over changes | Companies with heavy custom development or strict hosting needs |
| **Private cloud** | SAP or a hyperscaler hosts and operates it for one customer; the customer still has broad configuration and extension freedom | Large companies moving from ECC that want cloud operations without giving up flexibility |
| **Public cloud** | SAP runs one standard, multi-tenant product; customers configure within fixed limits and receive regular updates | Companies that want to adopt standard best-practice processes |

The trade-off is **flexibility versus standardisation**. The more you customise, the harder upgrades become. The
public cloud approach is often described as "clean core": keep the standard product untouched and build extensions
alongside it.

## Lab: map a company's departments to ERP modules

Use the phase's fictional company, **Kaveri Home Appliances Ltd**, a distributor that buys mixers and fans from
suppliers, stores them in a warehouse and sells them to retailers.

1. List Kaveri's departments: purchasing, stores/warehouse, sales, accounts, management, HR.
2. For each department, write two or three things it does every day (for example "raise a purchase order",
   "receive goods", "send an invoice").
3. Map each activity to an SAP module from the table above.
4. Draw arrows for at least three **integration points**, for example: goods receipt (MM) updates stock value in
   accounting (FI).
5. Note which modules Kaveri does **not** need. A pure distributor does not manufacture, so production planning (PP)
   is out of scope.

Keep this map: it becomes the starting point of your Week 20 build.

## Check yourself

1. In one sentence, what problem does integration solve that separate departmental tools cannot?
2. Why does a column store make "total sales for the year" faster than a row store?
3. A company wants regular automatic updates and is happy to adopt standard processes. Which deployment option fits
   best, and what does it give up?
