---
type: notes
title: "W22 · S2 · Sales and Distribution: Running the Order-to-Cash Cycle"
slug: w22-s2-sd-order-to-cash
topic: SAP SD & Order-to-Cash
subject: career
minutes: 35
description: The SD organisational units, every Order-to-Cash step from inquiry to incoming payment with its document and accounting effect, pricing with the condition technique, and an overview of credit management.
---
# Sales and Distribution: running the Order-to-Cash cycle

The mirror image of P2P: now Kaveri is the seller. The example is **Sharma Electricals** (a fictional retailer in
Mysuru) buying **50 mixer grinders at ₹3,600 each** through Kaveri's retail dealer channel.

## SD organisational units and master data

| Element | Role in O2C | Kaveri |
|---|---|---|
| Sales organisation | Sells the goods; responsible for terms and liability | `KS01` |
| Distribution channel | How goods reach the customer | `10` retail dealers |
| Division | Product line | `01` kitchen appliances |
| **Sales area** | Sales org + channel + division; customer sales data and prices are kept per sales area | `KS01 / 10 / 01` |
| Plant | Delivers the goods | `KB01` |
| Shipping point | Processes the delivery | Bengaluru dispatch bay |
| Company code | Owns the receivable and revenue | `KV01` |

Master data used:

| Master data | What O2C takes from it |
|---|---|
| **Customer business partner** (sales area data) | Currency, pricing group, shipping conditions, payment terms, credit data |
| **Material master** (sales views) | Sales unit, delivering plant, tax classification, availability check settings |
| **Pricing condition records** | The price and discounts for this material, customer or group |

## Step 1: Inquiry (`VA11`), optional

The customer asks: "Do you have 50 mixer grinders, and at what price?" An **inquiry** records the question so the sales
team can track which inquiries became orders. **Accounting effect: none.**

## Step 2: Quotation (`VA21`), optional

Kaveri replies with a **quotation**: material, quantity, price, terms and a **validity period**. A quotation is a
binding offer within its validity dates. Create it with reference to the inquiry. **Accounting effect: none.**

## Step 3: Sales order (`VA01`)

The customer accepts. Sales creates the **sales order** with reference to the quotation, so the data is copied and the
quotation is marked as converted.

When the order is saved, SAP runs several checks automatically:

- **Pricing**: determines the price, discounts and taxes (see below).
- **Availability check**: confirms whether 50 units can be delivered on the requested date.
- **Credit check**: checks the customer's credit exposure; the order can be **blocked** if the limit is exceeded.
- **Delivery scheduling**: works back from the customer's date to when picking must start.

**Accounting effect: none.** An order is a promise, not a financial event.

## Step 4: Outbound delivery (`VL01N`)

When the goods are due to ship, shipping creates an **outbound delivery** with reference to the sales order, for the
shipping point. The delivery drives warehouse work:

1. **Picking**: take the goods from the storage location (the delivery records the picked quantity).
2. **Packing** (optional): record cartons or pallets.

**Accounting effect: none yet.**

## Step 5: Post goods issue (PGI)

When the truck leaves, the warehouse posts **goods issue** from the delivery (in `VL02N` or a delivery monitor). Movement
type `601` reduces stock, and an accounting document records the cost of the goods sold, valued at the material's
current price in the material master (₹2,500 each in our example):

| Account | Dr / Cr | Amount |
|---|---|---|
| Cost of goods sold | Dr | ₹1,25,000 |
| Inventory – trading goods | Cr | ₹1,25,000 |

This is the **first accounting entry** in O2C. The goods have physically left Kaveri's warehouse, so in the standard
process their value leaves inventory at this point.

## Step 6: Billing (`VF01`)

Billing creates the **billing document** (the customer invoice) with reference to the delivery. Saving it releases an
accounting document to FI automatically:

| Account | Dr / Cr | Amount |
|---|---|---|
| Customer: Sharma Electricals (trade receivables) | Dr | ₹1,80,000 |
| Sales revenue | Cr | ₹1,80,000 |

(Output tax is left out for clarity; a real Indian invoice includes GST lines.) Kaveri's gross margin on the sale is
₹1,80,000 − ₹1,25,000 = ₹55,000.

## Step 7: Incoming payment (`F-28`)

When the customer pays, accounts receivable posts the **incoming payment** and clears the open invoice:

| Account | Dr / Cr | Amount |
|---|---|---|
| Bank | Dr | ₹1,80,000 |
| Customer: Sharma Electricals | Cr | ₹1,80,000 |

## Pricing basics: the condition technique

SAP calculates prices using **conditions**. Each condition is a price element: a base price, a discount, a surcharge,
freight or a tax. A **pricing procedure** lists which conditions apply and in what order, and SAP searches for a
matching **condition record** for each one, from the most specific key (this customer and this material) to the most
general.

| Step | Condition | Example | Value |
|---|---|---|---|
| 1 | Base price | `PR00` (standard price condition): ₹3,600 per unit × 50 | ₹1,80,000 |
| 2 | Customer discount | 2% for this customer | −₹3,600 |
| 3 | Net value | | ₹1,76,400 |
| 4 | Output tax | GST, determined by tax conditions | added on top |

The same calculation in Python, step by step as a pricing procedure would do it:

```python
quantity, unit_price = 50, 3600
gross = quantity * unit_price                    # base price condition
customer_discount = round(gross * 0.02)          # 2% customer discount
net = gross - customer_discount
print(gross, customer_discount, net)             # 180000 3600 176400
```

The worked postings above use the undiscounted ₹1,80,000 to keep the numbers simple. With the discount, billing would
post ₹1,76,400 to the customer and revenue (or post the discount to its own account, depending on configuration).

## Credit management: an overview

Selling on credit is a risk. **Credit management** sets a **credit limit** per customer and calculates the **credit
exposure**: open receivables plus open orders and deliveries not yet billed.

- If a new sales order would push exposure over the limit, the order is **blocked** for delivery.
- A credit controller reviews blocked orders and releases or rejects them.
- In S/4HANA this runs in SAP Credit Management, with credit data on the business partner.

## The whole cycle at a glance

| Step | Document | T-code | Stock effect | Accounting entry |
|---|---|---|---|---|
| 1 | Inquiry | `VA11` | none | none |
| 2 | Quotation | `VA21` | none | none |
| 3 | Sales order | `VA01` | none (creates a demand that the availability check counts) | none |
| 4 | Outbound delivery | `VL01N` | picked | none |
| 5 | Post goods issue (`601`) | from the delivery | −50 units | Dr COGS / Cr Inventory |
| 6 | Billing document | `VF01` | none | Dr Customer / Cr Revenue |
| 7 | Incoming payment | `F-28` | none | Dr Bank / Cr Customer |

## Lab: run a full O2C cycle

1. Create a quotation in `VA21` for your Week 20 customer: 50 mixer grinders, valid for 30 days.
2. Create a sales order in `VA01` with reference to the quotation. Open the pricing screen for the item and
   screenshot the conditions.
3. Create the outbound delivery in `VL01N`, record the picked quantity and post goods issue. Display the accounting
   document.
4. Create the billing document in `VF01`. Display its accounting document.
5. Post the incoming payment in `F-28`, clearing the invoice.
6. Record every document number in your mini project table.

## Check yourself

1. Which O2C documents create no accounting entry?
2. At post goods issue, why is the cost of goods sold ₹1,25,000 and not ₹1,80,000?
3. A sales order is blocked by the credit check. What has happened and who releases it?
