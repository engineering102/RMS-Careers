---
type: notes
title: "W21 · S2 · Accounts Payable, Accounts Receivable and the Universal Journal"
slug: w21-s2-ap-ar-universal-journal
topic: AP, AR & Universal Journal
subject: career
minutes: 35
description: Supplier and customer invoices and payments, open and cleared items, payment terms, an overview of Asset Accounting, and why the Universal Journal (ACDOCA) is the heart of S/4HANA finance.
---
# Accounts payable, accounts receivable and the Universal Journal

Session 1 posted directly to G/L accounts. Most real postings involve a **supplier** or a **customer**. These live in
**subledgers**: Accounts Payable (AP) for suppliers and Accounts Receivable (AR) for customers.

## Subledgers and open items

Each supplier and customer has its own account (its business partner number) showing every invoice and payment. When
you post to a supplier, SAP also posts the same amount to the supplier's **reconciliation account** in the G/L (Week 20,
Session 3). The G/L shows one total for "Trade payables"; the subledger shows who makes up that total.

An invoice that has not yet been paid is an **open item**. When a payment is posted against it, both the invoice and
the payment become **cleared items**, linked by a clearing document. Most AP and AR reports are lists of open items:
"what do we owe?" and "who owes us?".

## Accounts Payable: invoice and payment

Kaveri receives a ₹25,000 invoice from a logistics company for transport services. There is no purchase order, so
AP posts it directly in FI.

**Step 1 – supplier invoice** (transaction `FB60`, document type `KR`):

| Line | Account | Dr / Cr | Amount |
|---|---|---|---|
| 1 | Supplier: logistics company (posting key `31`) | Cr | ₹25,000 |
| 2 | Freight expense (G/L, posting key `40`) | Dr | ₹25,000 |

Behind the scenes, the credit to the supplier also credits the "Trade payables" reconciliation account. Our examples
leave out GST to keep the entries readable; in a real Indian company the invoice would also carry tax lines.

**Step 2 – outgoing payment** (for example with `F-53`, document type `KZ`):

| Line | Account | Dr / Cr | Amount |
|---|---|---|---|
| 1 | Supplier (posting key `25`) | Dr | ₹25,000 |
| 2 | Bank | Cr | ₹25,000 |

The payment **clears** the open invoice. In practice companies pay many suppliers at once with the **automatic payment
program** (`F110`), which selects due open items, applies the payment method and creates payment documents in bulk.

```text
        Supplier (logistics)                     Bank
  Dr               | Cr                   Dr             | Cr
  25,000 (payment) | 25,000 (invoice)                    | 25,000 (payment)
  Balance 0  → invoice cleared
```

Supplier invoices for **goods** that were ordered with a purchase order are posted through invoice verification
(`MIRO`) in MM instead. You will do that in Week 22.

### Payment terms

Payment terms on the business partner (copied into each invoice) set the **due date** and any **cash discount**, for
example "2% discount if paid within 10 days, otherwise net 30 days". The payment program uses them to decide what to pay
and when.

## Accounts Receivable: invoice and incoming payment

Kaveri charges a retailer ₹12,000 for an installation service (no delivery of goods, so it is posted in FI).

**Customer invoice** (`FB70`, document type `DR`):

| Line | Account | Dr / Cr | Amount |
|---|---|---|---|
| 1 | Customer: Sharma Electricals (posting key `01`) | Dr | ₹12,000 |
| 2 | Service revenue | Cr | ₹12,000 |

**Incoming payment** (`F-28`, document type `DZ`):

| Line | Account | Dr / Cr | Amount |
|---|---|---|---|
| 1 | Bank | Dr | ₹12,000 |
| 2 | Customer (posting key `15`) | Cr | ₹12,000 |

Sales of goods are normally invoiced through **SD billing** (`VF01`), which creates the customer invoice in FI
automatically. FI invoices like the one above are used for items that do not go through the sales process.

### Line-item reports

| Report (classic T-code) | Shows |
|---|---|
| `FBL1N` | Supplier line items: open, cleared or all |
| `FBL5N` | Customer line items |
| `FBL3N` | G/L account line items |

In S/4HANA these are also available as Fiori apps for managing supplier and customer line items.

## Asset Accounting: an overview

Some purchases are not expenses but **fixed assets**: delivery vans, warehouse racks, computers. Their cost is spread
over their useful life through **depreciation**.

| Stage | What happens | Typical entry |
|---|---|---|
| Create asset master | An asset record in an **asset class** (vehicles, IT equipment) that sets the depreciation rules | none |
| Acquisition | The asset is bought | Dr Asset, Cr Supplier |
| Depreciation | A periodic run posts the cost of using the asset | Dr Depreciation expense, Cr Accumulated depreciation |
| Retirement | The asset is sold or scrapped | Remove cost and depreciation; record gain or loss |

An asset in SAP has its own subledger, just like suppliers and customers, with reconciliation accounts in the G/L.

Simple straight-line depreciation for a ₹6,00,000 delivery van over 5 years with no residual value:

```python
cost, years = 600_000, 5
per_year = cost / years
per_month = per_year / 12
print(per_year, per_month)   # 120000.0 10000.0
```

## The Universal Journal (ACDOCA)

In older SAP ERP, finance data was spread across many tables: separate tables for the G/L, for controlling, for assets,
plus total tables that had to be kept in step. Reconciling them was a regular month-end job.

S/4HANA stores the line items of financial accounting, controlling, asset accounting and material ledger in **one
table**, the **Universal Journal**, table `ACDOCA`. Each line carries the G/L account **and** the controlling details
(cost centre, profit centre and others) together.

| Before (ECC) | S/4HANA |
|---|---|
| FI and CO stored separately, reconciled at period end | One line item serves both FI and CO |
| Total tables updated on every posting | Totals calculated on the fly from line items |
| Cost elements maintained separately from G/L accounts | Cost elements are G/L accounts |

Conceptually, a report on the Universal Journal is one query over one table. A simplified illustration (the real
table has hundreds of columns with short technical names):

```sql
-- Simplified view of the Universal Journal
SELECT gl_account, cost_center, SUM(amount_local) AS total
FROM universal_journal
WHERE company_code = 'KV01'
  AND fiscal_year  = 2026
GROUP BY gl_account, cost_center
ORDER BY gl_account;
```

The same lines answer the accountant's question ("balance of freight expense") and the controller's question ("freight
cost of the warehouse cost centre"). That is the **single source of truth** idea.

## Lab: post an AP invoice and payment

1. Post a supplier invoice for Kaveri with `FB60`: supplier from your Week 20 master data, ₹25,000, freight expense
   account, cost centre if required. Note the document number.
2. Display the supplier's open items with `FBL1N`. Your invoice should appear as open.
3. Post the outgoing payment with `F-53`, selecting the open invoice so that it is cleared. Note the payment document
   number.
4. Run `FBL1N` again for cleared items and confirm both documents are linked by the clearing document.
5. Draw T-accounts for the supplier, freight expense and bank.
6. Optional: post a customer invoice with `FB70` and receive the payment with `F-28`.

## Check yourself

1. What makes an invoice an "open item", and what changes when it is paid?
2. Why is a ₹6,00,000 delivery van not posted as an expense in the month it is bought?
3. Name one reconciliation job that the Universal Journal removes.
