---
type: notes
title: "W21 · S1 · FI Structure and General Ledger Accounting"
slug: w21-s1-fi-structure-general-ledger
topic: SAP FI & General Ledger
subject: career
minutes: 35
description: A debits-and-credits primer, then the FI enterprise structure (company code, chart of accounts, fiscal year variant, posting periods) and how a G/L journal entry is built from document types and posting keys.
---
# FI structure and general ledger accounting

Financial Accounting (**FI**) records every transaction that changes a company's financial position, and produces the
statements that the law and investors require. To follow any FI screen you need the basic language of accounting
first, so this session starts there.

## Primer: the accounting equation, debits and credits

Every company's books obey one equation:

```text
Assets = Liabilities + Equity
```

- **Assets**: what the company owns or is owed: bank balance, inventory, money customers owe (receivables).
- **Liabilities**: what it owes others: money owed to suppliers (payables), loans, taxes due.
- **Equity**: the owners' share: capital put in plus profits kept.

Income increases equity and expenses reduce it, so income and expense accounts sit "inside" equity.

**Double entry** means every transaction is recorded on at least two accounts so that the equation stays balanced.
Each line is either a **debit (Dr)** or a **credit (Cr)**, and in every entry **total debits = total credits**.

| Account category | A debit… | A credit… |
|---|---|---|
| Asset | increases it | decreases it |
| Expense | increases it | decreases it |
| Liability | decreases it | increases it |
| Equity | decreases it | increases it |
| Income (revenue) | decreases it | increases it |

Examples from Kaveri Home Appliances Ltd:

| Event | Debit | Credit |
|---|---|---|
| Pays ₹18,000 office rent from the bank | Rent expense ₹18,000 | Bank ₹18,000 |
| Owners add ₹5,00,000 capital | Bank ₹5,00,000 | Share capital ₹5,00,000 |
| Buys a ₹60,000 laptop on credit | Office equipment ₹60,000 | Supplier (payable) ₹60,000 |

A **T-account** is a quick sketch of one account: debits on the left, credits on the right.

```text
        Bank
  Dr            | Cr
  5,00,000      | 18,000
  Balance 4,82,000 (Dr)
```

A tiny Python check captures the one rule SAP enforces before it saves any document:

```python
def is_balanced(lines: list[tuple[str, str, float]]) -> bool:
    """lines: (account, 'D' or 'C', amount). True if debits equal credits."""
    debits = sum(amount for _, side, amount in lines if side == "D")
    credits = sum(amount for _, side, amount in lines if side == "C")
    return round(debits - credits, 2) == 0

rent = [("Rent expense", "D", 18000.0), ("Bank", "C", 18000.0)]
print(is_balanced(rent))                                   # True
print(is_balanced([("Rent expense", "D", 18000.0)]))       # False: SAP will not post this
```

## The FI enterprise structure

| Element | What it defines | Kaveri example |
|---|---|---|
| **Company code** | The legal entity whose books are kept; has a local currency | `KV01`, currency INR |
| **Chart of accounts** | The list of G/L accounts (numbers and names) that company codes use | One chart shared by all Kaveri company codes |
| **Fiscal year variant** | How many posting periods a year has and when the year starts | April–March, 12 periods plus special periods |
| **Posting period variant** | Which periods are open for posting | Only the current month open |
| **Field status** | Which fields are required, optional or hidden when posting | Cost centre required on expense accounts |

### Fiscal year variant

Indian companies usually use a financial year from **April to March**. In SAP's standard settings the variant `V3` is
commonly used for this: period 1 is April and period 12 is March. Variant `K4` is the calendar year (January to
December). Both include **four special periods** (13 to 16) for year-end adjustments that should not disturb March.

### Posting periods

Finance controls which periods are **open**. When March is closed, nobody can post into March by mistake. The open and
close settings are maintained by finance (for example with transaction `OB52`), usually opening the new month and
closing the old one as part of the month-end routine.

## G/L accounting

The **general ledger** holds every G/L account and its balance. Postings arrive in two ways:

1. **Manual journal entries**: for example accruals, rent, corrections.
2. **Automatic postings** from other modules: goods receipts, supplier invoices, billing documents and payments. Most
   G/L lines in a real company are automatic.

Each posting creates an **accounting document** with:

- a **header**: document type, document date, posting date, company code, currency, reference, header text;
- at least two **line items**: each with a posting key (or debit/credit indicator), account and amount.

The **document date** is the date on the original paper (for example the supplier's invoice). The **posting date**
decides the period in which the amount appears in the books.

## Document types

The **document type** classifies the document and controls its number range and which account types it can post to.

| Document type | Used for |
|---|---|
| `SA` | G/L account document (manual journal entry) |
| `KR` | Supplier invoice |
| `KZ` | Supplier payment |
| `DR` | Customer invoice |
| `DZ` | Customer payment |
| `WE` | Goods receipt (from MM) |
| `RE` | Invoice receipt from invoice verification (MM) |
| `RV` | Billing document transferred from SD |

## Posting keys

In the classic posting screens each line has a two-digit **posting key** that says **debit or credit** and **which type
of account** (G/L, customer, supplier). The simpler "enjoy" screens such as `FB50` show a Debit/Credit choice instead,
but the posting key is still stored on every line.

| Posting key | Meaning |
|---|---|
| `40` | Debit a G/L account |
| `50` | Credit a G/L account |
| `01` | Debit a customer (invoice) |
| `11` | Credit a customer (credit memo) |
| `15` | Credit a customer (incoming payment) |
| `31` | Credit a supplier (invoice) |
| `21` | Debit a supplier (credit memo) |
| `25` | Debit a supplier (outgoing payment) |

So Kaveri's rent payment as a G/L document is: line 1, key `40`, rent expense ₹18,000; line 2, key `50`, bank
₹18,000.

## Lab: post and display a G/L journal entry

1. Open `FB50` (Enter G/L Account Document) in your training company code. The Fiori equivalent is the journal entry
   app for G/L postings.
2. Enter document date and posting date (today), and a header text "Office rent – March".
3. Line 1: rent expense account, Debit, ₹18,000, with the cost centre the tutor gives you.
4. Line 2: bank account, Credit, ₹18,000.
5. Check the balance indicator shows zero, choose **Simulate** to preview, then **Post**. Note the document number from
   the status bar.
6. Display the document with `FB03`. Identify the document type, posting keys and fiscal period.
7. Sketch the two T-accounts and add the screenshots and your explanation to your FI/CO log.

## Check yourself

1. Kaveri receives ₹40,000 from a customer into its bank. Which account is debited and which is credited?
2. With fiscal year variant `V3`, which period does a posting dated 15 June fall into?
3. What is the difference between the document date and the posting date?
