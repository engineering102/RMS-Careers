---
type: notes
title: "W22 · S1 · Materials Management: Running the Procure-to-Pay Cycle"
slug: w22-s1-mm-procure-to-pay
topic: SAP MM & Procure-to-Pay
subject: career
minutes: 35
description: The MM organisational units and master data, then every Procure-to-Pay step from purchase requisition to payment, with the document each creates, the three-way match and the stock and accounting effect.
---
# Materials Management: running the Procure-to-Pay cycle

In Week 20 you drew Procure-to-Pay (P2P) as a diagram. This week you run it, step by step, and explain each document.
The example is Kaveri Home Appliances Ltd buying **100 mixer grinders at ₹2,500 each** from a supplier, Deccan
Electricals (fictional).

## MM organisational units and master data

| Element | Role in P2P | Kaveri |
|---|---|---|
| Purchasing organisation | Negotiates with suppliers; responsible for the purchase order | `KP01` |
| Purchasing group | The buyer or buying desk | Kitchen appliances desk |
| Plant | Where the goods are received and valued | `KB01` Bengaluru |
| Storage location | Where the stock is put away | `0001` main store |
| Company code | Whose books the inventory and payable belong to | `KV01` |

Master data used:

| Master data | What P2P takes from it |
|---|---|
| **Material master** | Description, order unit, purchasing group, valuation class (which inventory account to use) |
| **Supplier business partner** | Address, order currency, payment terms, reconciliation account for payables |
| **Purchasing info record** (`ME11`) | The agreed price and delivery time for **this material from this supplier** |

The info record is what lets a purchase order propose ₹2,500 automatically instead of the buyer typing it each time.

## Step 1: Purchase requisition (`ME51N`)

Stores notices stock is low and raises a **purchase requisition (PR)**: an internal request saying "we need 100 mixer
grinders in plant KB01 by the 20th". It names the material, quantity, plant and date, but it is **not** a commitment to
any supplier.

- Requisitions can also be created automatically by material requirements planning when stock falls below a reorder
  point.
- Requisitions can go through a **release (approval) strategy**, for example manager approval above a value.
- **Accounting effect: none.**

## Step 2: Purchase order (`ME21N`)

Purchasing turns the requisition into a **purchase order (PO)**: a legal document sent to the supplier, with quantity,
price, delivery date, delivery address (plant) and payment terms.

- Create it **with reference to the PR** so the PR shows it has been ordered.
- The price is proposed from the info record; payment terms come from the supplier.
- The PO has a **PO history** tab where every later goods receipt and invoice appears.
- **Accounting effect: none.** A PO is a commitment, not yet a financial transaction.

## Step 3: Goods receipt (`MIGO`, movement type `101`)

When the truck arrives, stores posts a **goods receipt (GR)** against the PO. In `MIGO` choose **Goods Receipt →
Purchase Order**, enter the PO number, check the quantity actually delivered, set the storage location and post.

Two documents are created:

1. A **material document** recording the stock movement (movement type `101` = goods receipt for a purchase order).
2. An **accounting document** valuing the stock:

| Account | Dr / Cr | Amount |
|---|---|---|
| Inventory – trading goods | Dr | ₹2,50,000 |
| GR/IR clearing | Cr | ₹2,50,000 |

**GR/IR (goods received / invoice received)** is a temporary clearing account. It means "we have the goods but not yet
the supplier's invoice". It is cleared in the next step.

Stock can now be seen in the stock overview (`MMBE`): 100 units more in plant `KB01`, storage location `0001`.

If only 80 arrive, post 80. The PO stays open for the remaining 20.

## Step 4: Invoice verification (`MIRO`)

The supplier's invoice arrives. Accounts payable enters it in `MIRO` **with reference to the PO**. SAP proposes the
quantity received and the PO price, and the clerk compares this with the paper invoice.

This is the **three-way match**:

| Compared | Question |
|---|---|
| PO | What did we order, and at what price? |
| Goods receipt | What actually arrived? |
| Invoice | What is the supplier charging? |

If quantity or price differences exceed the configured **tolerances**, the invoice is posted but **blocked for payment**
until someone investigates.

The idea in Python:

```python
def three_way_match(po_price: float, gr_qty: int, inv_qty: int, inv_price: float,
                    price_tolerance_pct: float = 2.0) -> str:
    if inv_qty > gr_qty:
        return "BLOCKED: invoiced quantity is more than received"
    if abs(inv_price - po_price) / po_price * 100 > price_tolerance_pct:
        return "BLOCKED: price difference outside tolerance"
    return "OK: release for payment"

print(three_way_match(2500, gr_qty=100, inv_qty=100, inv_price=2500))  # OK: release for payment
print(three_way_match(2500, gr_qty=80, inv_qty=100, inv_price=2500))   # BLOCKED: invoiced quantity is more than received
print(three_way_match(2500, gr_qty=100, inv_qty=100, inv_price=2700))  # BLOCKED: price difference outside tolerance
```

Posting the invoice creates an accounting document (document type `RE`):

| Account | Dr / Cr | Amount |
|---|---|---|
| GR/IR clearing | Dr | ₹2,50,000 |
| Supplier: Deccan Electricals (trade payables) | Cr | ₹2,50,000 |

GR/IR is now back to zero for this PO, and Kaveri owes the supplier. (Tax is left out for clarity; a real invoice would
include GST lines.)

## Step 5: Payment (`F110` or `F-53`)

On the due date from the payment terms, the payment program (`F110`) picks up the open, unblocked invoice and pays it.
A single invoice can also be paid manually with `F-53`.

| Account | Dr / Cr | Amount |
|---|---|---|
| Supplier: Deccan Electricals | Dr | ₹2,50,000 |
| Bank | Cr | ₹2,50,000 |

The invoice is cleared. The P2P cycle is complete.

## The whole cycle at a glance

| Step | Document | T-code | Stock effect | Accounting entry |
|---|---|---|---|---|
| 1 | Purchase requisition | `ME51N` | none | none |
| 2 | Purchase order | `ME21N` | none (shows as "on order") | none |
| 3 | Goods receipt (`101`) | `MIGO` | +100 units | Dr Inventory / Cr GR/IR |
| 4 | Invoice receipt | `MIRO` | none | Dr GR/IR / Cr Supplier |
| 5 | Outgoing payment | `F110` / `F-53` | none | Dr Supplier / Cr Bank |

To see the chain afterwards, open the PO in `ME23N` and read its **PO history**: the goods receipt and invoice appear
with their document numbers.

## Lab: run a full P2P cycle

1. Create a PR in `ME51N` for 100 units of your Week 20 mixer grinder material in your plant. Note the number.
2. Create a PO in `ME21N` with reference to the PR, using your supplier. Note the number.
3. Post the goods receipt in `MIGO` (movement type `101`). Note the material document number and display its
   accounting document.
4. Check the stock in `MMBE`.
5. Post the invoice in `MIRO` with reference to the PO. Note the invoice document number.
6. Pay the invoice (`F-53` or as the tutor directs). Note the payment document number.
7. Open the PO in `ME23N` and screenshot the PO history. Record every document number in a table for your mini
   project.

## Check yourself

1. Why does a purchase order not create an accounting entry?
2. What does a credit balance on the GR/IR account for a PO mean?
3. The supplier invoices 100 units but only 80 were received. What does SAP do with the invoice?
