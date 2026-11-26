---
type: notes
title: "W22 · S3 · Logistics–Finance Integration and Document Flow"
slug: w22-s3-integration-document-flow
topic: MM–FI & SD–FI Integration
subject: career
minutes: 35
description: How a goods movement or billing document finds the right G/L accounts through automatic account determination, the full set of MM–FI and SD–FI postings, how to trace them with document flow, and the standard reports that show them.
---
# Logistics–finance integration and document flow

Nobody in stores types a G/L account when posting a goods receipt, and nobody in billing chooses the revenue account.
Yet both create correct accounting documents. This session explains how, and how to trace every document a process
created. Interviewers for SAP roles ask about this more than any other topic.

## Automatic account determination

When a logistics document posts to FI, SAP works out the G/L accounts from **configuration plus master data**.

### MM: goods movements and invoices

For MM postings, configuration (transaction `OBYC`) maps **transaction keys** to G/L accounts. The key is chosen by the
type of posting; the account also depends on the material's **valuation class** (from the accounting view of the
material master) and the chart of accounts.

| Transaction key | Meaning | Kaveri account |
|---|---|---|
| `BSX` | Inventory posting | Inventory – trading goods |
| `WRX` | GR/IR clearing | GR/IR clearing |
| `GBB` | Offsetting entry for inventory postings (with sub-keys per scenario, for example `VAX` for goods issue to a sales order) | Cost of goods sold |
| `PRD` | Price differences | Price differences |

```text
Goods receipt for a PO (movement type 101)
   material  ──► valuation class ──┐
   movement  ──► transaction keys ─┼──► OBYC table ──► G/L accounts
   chart of accounts ──────────────┘
                     BSX → Dr Inventory      WRX → Cr GR/IR
```

So a buyer who sets up a new mixer material with the right valuation class has, without knowing it, decided which
inventory account every future receipt will hit. Master data mistakes become accounting mistakes.

### SD: billing

For billing, revenue account determination (transaction `VKOA`) uses fields such as the sales organisation, the
customer's and material's **account assignment groups**, and an **account key** from the pricing procedure. For
example, the price condition carries account key `ERL` (revenue), so its value posts to the sales revenue account.
Discounts can carry a different key so that they post to a separate sales deductions account.

The customer side of the billing posting needs no configuration of this kind: it goes to the customer, and through the
customer's **reconciliation account** to trade receivables.

## All the postings in one table

Using this week's numbers: Kaveri buys 100 mixers at ₹2,500 and sells 50 at ₹3,600 (tax left out).

| Process step | Origin | Debit | Credit | Amount |
|---|---|---|---|---|
| Goods receipt | MM (`MIGO`, `101`) | Inventory (`BSX`) | GR/IR (`WRX`) | ₹2,50,000 |
| Invoice verification | MM (`MIRO`) | GR/IR (`WRX`) | Supplier → trade payables | ₹2,50,000 |
| Outgoing payment | FI (`F110` / `F-53`) | Supplier | Bank | ₹2,50,000 |
| Post goods issue | SD delivery (`601`) | Cost of goods sold (`GBB`) | Inventory (`BSX`) | ₹1,25,000 |
| Billing | SD (`VF01`) | Customer → trade receivables | Sales revenue (`ERL`) | ₹1,80,000 |
| Incoming payment | FI (`F-28`) | Bank | Customer | ₹1,80,000 |

Check the integration with the accounting equation after all six postings:

```python
balances = {"Inventory": 0, "GR/IR": 0, "Payables": 0, "Bank": 0,
            "COGS": 0, "Receivables": 0, "Revenue": 0}

def post(debit: str, credit: str, amount: int) -> None:
    balances[debit] += amount     # positive = debit balance
    balances[credit] -= amount    # negative = credit balance

post("Inventory", "GR/IR", 250_000)        # goods receipt
post("GR/IR", "Payables", 250_000)         # invoice verification
post("Payables", "Bank", 250_000)          # outgoing payment
post("COGS", "Inventory", 125_000)         # post goods issue
post("Receivables", "Revenue", 180_000)    # billing
post("Bank", "Receivables", 180_000)       # incoming payment

print(balances)
print("Profit:", -balances["Revenue"] - balances["COGS"])   # 55000
print("Balanced:", sum(balances.values()) == 0)             # True
```

The dictionary shows inventory at ₹1,25,000 (the 50 unsold mixers), GR/IR, payables and receivables at zero, bank at
−₹70,000 (₹2,50,000 out, ₹1,80,000 in), and a profit of ₹55,000. Every account that should clear has cleared. That is
what a working integration looks like.

## Document flow

Every SAP document created **with reference to** another keeps a link to it. The chain of links is the **document
flow**, and it lets anyone start from any document and see the whole process.

### O2C document flow

Open the sales order (`VA03`) and choose **Display document flow** (also available from the delivery and the billing
document):

```text
Quotation 20000012                        Completed
 └─ Standard order 10000045               Completed
     └─ Outbound delivery 80000031        Completed
         ├─ Goods issue (material doc.)   Completed
         └─ Invoice 90000027              Completed
             └─ Journal entry             Cleared
```

(Document numbers and status texts are illustrative; your system's number ranges and labels will differ.) The status column tells you instantly where
a process is stuck: an order "being processed" with no delivery, or a delivery with no invoice.

### P2P document flow

For purchasing, open the PO in `ME23N` and read the **PO history** tab. It lists each goods receipt (movement type
`101`) and invoice receipt with document numbers, quantities and amounts. Open any material document and use its
**FI document** link to see the accounting entry.

## Standard reports

| Question | Report (classic T-code) |
|---|---|
| Which purchase orders exist, and what is still to be delivered or invoiced? | Purchase orders by number (`ME2N`) |
| Which material documents were posted, with which movement types? | Material document list (`MB51`) |
| What stock do we have per plant and storage location? | Stock overview (`MMBE`), warehouse stock (`MB52`) |
| Which sales orders exist for a customer? | List of sales orders (`VA05`) |
| What is the balance of GR/IR, inventory or revenue? | G/L balances (`FS10N`) and line items (`FBL3N`) |
| What does each customer owe? | Customer line items (`FBL5N`) |

Fiori apps cover the same questions with role-based screens, for example apps that monitor purchase order items or
sales order fulfilment issues.

## Lab: trace the accounting documents of both cycles

1. Open your sales order from Session 2 in `VA03` and display its document flow. Screenshot it.
2. From the document flow, open the goods issue and the invoice, and from each one display the accounting document.
   Write down the accounts and amounts.
3. Open your PO from Session 1 in `ME23N`. Screenshot the PO history and open the accounting documents of the goods
   receipt and the invoice.
4. Fill in a table with columns: step, document number, origin, debit account, credit account, amount. It is the
   integration section of Mini Project 5.
5. Run `MB51` for your material and find both the `101` and `601` movements.
6. Check the GR/IR balance for your PO. Explain why it is zero after the invoice.

## Check yourself

1. Which master data field links a material to its inventory G/L account?
2. Which posting debits cost of goods sold, and which document creates it?
3. A delivery shows in the document flow but no invoice follows it. What does that mean for the month's revenue?
