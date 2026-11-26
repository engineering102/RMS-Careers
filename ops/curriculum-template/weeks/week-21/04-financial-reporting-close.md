---
type: notes
title: "W21 · S4 · Financial Reporting and Period-End Close"
slug: w21-s4-financial-reporting-close
topic: FI Reporting & Close
subject: career
minutes: 30
description: How postings become a trial balance, a balance sheet and a profit and loss statement, which line-item reports answer everyday questions, and the main steps of a month-end close in SAP.
---
# Financial reporting and period-end close

Every posting you made this week ends up in a report. This session shows how to read those reports, how to trace a
number back to the documents behind it, and what finance teams do at month end so that the reports can be trusted.

## From postings to reports

```text
Documents (journal entries, invoices, payments, goods movements)
   → line items in the Universal Journal
      → G/L account balances
         → Trial balance
            → Balance sheet + Profit and loss statement
```

### Trial balance

A **trial balance** lists every G/L account with its debit or credit balance for a period. Because every document is
balanced, **total debits equal total credits**. If they do not, something is wrong with the data, not the arithmetic.

You can build a trial balance from postings in a few lines of Python:

```python
from collections import defaultdict

postings = [  # (document, account, 'D' or 'C', amount in ₹)
    (1, "Bank", "D", 500000), (1, "Share capital", "C", 500000),
    (2, "Rent expense", "D", 18000), (2, "Bank", "C", 18000),
    (3, "Freight expense", "D", 25000), (3, "Trade payables", "C", 25000),
    (4, "Trade payables", "D", 25000), (4, "Bank", "C", 25000),
]

balance = defaultdict(int)          # positive = debit balance, negative = credit balance
for _, account, side, amount in postings:
    balance[account] += amount if side == "D" else -amount

for account, value in sorted(balance.items()):
    side = "Dr" if value >= 0 else "Cr"
    print(f"{account:<16} {abs(value):>9,} {side}")

print("Balanced:", sum(balance.values()) == 0)
```

Output:

```text
Bank               457,000 Dr
Freight expense     25,000 Dr
Rent expense        18,000 Dr
Share capital      500,000 Cr
Trade payables           0 Dr
Balanced: True
```

### Balance sheet and profit and loss

| Statement | Shows | Contains | Time view |
|---|---|---|---|
| **Balance sheet** | What the company owns and owes | Asset, liability and equity accounts | A position **at** a date |
| **Profit and loss (P&L)** | Whether the company made money | Revenue and expense accounts | Performance **over** a period |

The P&L result (profit or loss) flows into equity on the balance sheet, which is why the accounting equation still
holds after a profitable month.

In SAP the layout of both statements is defined by a **financial statement version**: a hierarchy that groups G/L
accounts into lines such as "Current assets → Inventory" or "Operating expenses → Freight". The same postings can be
shown in different layouts, for example a statutory layout and a management layout.

### Where to find the reports

| Question | Where to look |
|---|---|
| What is the balance of one account, month by month? | G/L account balance display (`FS10N`), or the Fiori app for G/L account balances |
| Which documents make up that balance? | Drill down from the balance, or G/L line items (`FBL3N`) |
| What do we owe each supplier? | Supplier line items (`FBL1N`), open items |
| Who owes us money and how overdue is it? | Customer line items (`FBL5N`), open items with due dates |
| Trial balance for the company code | The Fiori trial balance app, or classic financial statement reports |
| Balance sheet and P&L | Financial statement reports, using the financial statement version (classic `F.01`) |
| Cost centre actual costs | Cost centre line items (`KSB1`) and cost centre reports |

The most useful habit: **always drill down**. Click a balance to see its line items, then open a line item to see the
original document. An interviewer asking "where does this number come from?" wants exactly that path.

## Period-end close

At the end of every month (and with extra steps at year end) finance runs a **close** so that the period's numbers are
complete and correct. A typical checklist:

| # | Step | Why |
|---|---|---|
| 1 | Open the new posting period | Day-to-day work continues into the next month |
| 2 | Make sure all operational documents are posted | Goods receipts, invoices and billing for the month must be in |
| 3 | Post accruals and deferrals | Record expenses incurred but not yet invoiced, and income received in advance |
| 4 | Run depreciation | Charge the month's share of fixed asset costs |
| 5 | Review the GR/IR clearing account | Find goods received but not invoiced, or invoiced but not received |
| 6 | Revalue foreign currency open items | Supplier or customer items in USD or EUR are restated at the month-end rate |
| 7 | Run CO allocations and settle internal orders | Move shared costs to the right cost centres and orders to their receivers |
| 8 | Reconcile and review | Check subledgers, bank balances and unusual items |
| 9 | Close the old posting period | Prevent back-dated postings |
| 10 | Report | Trial balance, P&L, balance sheet, management reports |

At **year end**, balances are also **carried forward**: balance sheet accounts carry their closing balances into the new
year, and the P&L result is transferred to a retained earnings account so that P&L accounts start the new year at zero.

Because S/4HANA keeps FI and CO in one Universal Journal, several reconciliation steps that used to take days in older
systems are no longer needed. This is one reason companies talk about a "faster close" after moving to S/4HANA.

## Lab: generate and interpret standard reports

1. Run the trial balance for your training company code for the current period. Confirm total debits equal total
   credits.
2. Find the rent, freight and electricity postings from this week. Note each account's balance.
3. Drill down from one balance to its line items and then to the original document. Screenshot each level.
4. Run a balance sheet or P&L report. Pick **two numbers** and trace each one back to a document you posted.
5. Run `KSB1` for cost centre `KBWH` and match the amount to the FI document from Session 3.
6. Add the screenshots and a short "number → document" trace to your FI/CO log.

## Check yourself

1. Why must a trial balance always balance, and what does it mean if it does not?
2. Does a balance sheet describe a point in time or a period? What about a P&L?
3. Why does finance close the previous posting period after month end?
