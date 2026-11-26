---
type: notes
title: "W21 · S3 · Controlling: Cost Centres, Profit Centres and Internal Orders"
slug: w21-s3-controlling-co
topic: SAP Controlling (CO)
subject: career
minutes: 35
description: What management accounting adds to financial accounting, the controlling area, cost elements as G/L accounts in S/4HANA, cost centres, profit centres and internal orders, and how one FI posting updates CO.
---
# Controlling: cost centres, profit centres and internal orders

Financial accounting answers **external** questions: what is the company's profit, what does it owe? **Controlling
(CO)** answers **internal** ones: which department is overspending, which product line makes money, how much did the
Diwali promotion actually cost?

| | FI (financial accounting) | CO (management accounting) |
|---|---|---|
| Audience | Tax authorities, auditors, shareholders, banks | Managers inside the company |
| Rules | Legal and accounting standards | Whatever helps decisions |
| Main objects | G/L accounts, suppliers, customers, assets | Cost centres, profit centres, internal orders |
| Question | "What is our profit?" | "Where did the cost arise and who is responsible?" |

## Controlling area

The **controlling area** is the organisational unit in which costs are managed. One or more company codes are assigned
to it. Kaveri has one company code, so one controlling area covers it. A group with several companies can assign them
all to one controlling area if they share a chart of accounts and fiscal year variant, so costs can be compared and
allocated across them.

## Cost elements are G/L accounts

In S/4HANA there is no separate cost element master. A **cost element** is a G/L account with a **cost element
category**:

| Kind | What it is | Example |
|---|---|---|
| **Primary cost element** | A P&L G/L account whose postings come from FI and also flow to CO | Salaries, rent, freight, electricity |
| **Secondary cost element** | A G/L account used only **inside** CO to move costs between objects | Assessment of warehouse costs to sales departments |

Because they are the same accounts, every expense posted in FI with a cost object reaches CO automatically. There is
nothing to reconcile.

## Cost centres

A **cost centre** is a place in the organisation where costs arise and a manager is responsible for them: the
warehouse, the sales team, HR, IT.

- Created with `KS01` (display `KS03`). Key fields: name, person responsible, **cost centre category** (for example
  administration, sales), company code, profit centre, validity dates.
- Every cost centre belongs to the **standard hierarchy**, a tree that groups cost centres for reporting.

```text
KAVERI (standard hierarchy)
├── OPERATIONS
│   ├── KBWH  Bengaluru warehouse
│   └── KBLG  Logistics
├── SALES
│   ├── KSRT  Retail dealer sales
│   └── KSON  Online sales
└── ADMIN
    ├── KFIN  Finance
    └── KHR   Human resources
```

When an expense is posted to a primary cost element, a cost object is usually **required**. That is how the warehouse
electricity bill is charged to the warehouse cost centre, not just to "Electricity expense".

### Allocations

Costs often need to be moved. The warehouse serves both sales channels, so at month end its costs can be shared out:

- **Assessment** moves costs using a secondary cost element (the receiver sees "warehouse assessment", not the original
  accounts).
- **Distribution** moves costs keeping the original primary cost elements.

A simple allocation in Python, splitting a warehouse cost by the share of units shipped:

```python
warehouse_cost = 3_00_000                       # ₹ for the month
units_shipped = {"KSRT": 1_800, "KSON": 1_200}  # retail vs online

total_units = sum(units_shipped.values())
allocation = {cc: round(warehouse_cost * units / total_units) for cc, units in units_shipped.items()}
print(allocation)   # {'KSRT': 180000, 'KSON': 120000}
```

## Profit centres

A **profit centre** is a part of the business that is managed for **profit**, with both revenue and costs: a product
line, a region or a channel.

- Created with `KE51` (display `KE53`).
- Each cost centre is assigned to a profit centre, and each material can carry a profit centre, so revenue from
  billing and costs from cost centres land on the same profit centre.
- Profit centre reports show a mini P&L for each part of the business.

For Kaveri, two profit centres by product line make sense: **kitchen appliances** and **fans**. Management can then see
whether fans earn their share of warehouse and sales costs.

## Internal orders

An **internal order** collects costs for a **specific, time-limited activity**: a trade fair, a marketing campaign, a
warehouse repair.

- Created with `KO01`. It has an order type, a responsible cost centre and optionally a budget.
- Costs are posted to the order while the activity runs.
- At the end, the order is **settled**: its total is moved to a permanent receiver such as a cost centre, or to an
  asset if the activity built one.

Example: Kaveri runs a festive-season promotion. Posters, a dealer meet and newspaper advertisements are posted to
internal order "Festive promo 2026". After the campaign, the order shows the full cost in one place, and settlement
moves it to the sales cost centre.

## FI–CO integration in one posting

When Kaveri posts the warehouse electricity bill:

| Line | Account | Dr / Cr | Amount | Cost object |
|---|---|---|---|---|
| 1 | Electricity expense (primary cost element) | Dr | ₹42,000 | Cost centre `KBWH` |
| 2 | Supplier: electricity board | Cr | ₹42,000 | — |

One document, one set of lines in the Universal Journal:

- **FI view**: electricity expense increases by ₹42,000 and payables by ₹42,000.
- **CO view**: cost centre `KBWH` shows ₹42,000 actual cost on the electricity cost element.
- **Profit centre view**: because `KBWH` is assigned to a profit centre, that profit centre also shows the cost.

## Lab: create a cost centre and post costs to it

1. Create cost centre `KBWH` "Bengaluru warehouse" with `KS01` in your controlling area. Set the person responsible,
   category and profit centre as the tutor specifies, and place it in the standard hierarchy.
2. Post a G/L journal entry (`FB50`) for warehouse electricity: Dr electricity expense ₹42,000 with cost centre `KBWH`,
   Cr bank ₹42,000. Note the document number.
3. Display cost centre line items with `KSB1` and find your posting.
4. Display the same FI document with `FB03`. Confirm that the same line carries both the G/L account and the cost
   centre.
5. Optional: create an internal order for a dealer meet, post a cost to it, and note what settlement would do.
6. Write 3–4 lines in your FI/CO log explaining how the one posting appears in FI and in CO.

## Check yourself

1. What is the difference between a primary and a secondary cost element?
2. When would you use an internal order instead of posting directly to a cost centre?
3. A cost centre manager wants to know why their costs went up. Which report would you start from?
