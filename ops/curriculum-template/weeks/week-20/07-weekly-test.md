---
type: quiz
title: "W20 · Weekly Test: ERP, SAP Org Structure and Core Processes"
slug: w20-weekly-test
topic: Week 20 Assessment
subject: career
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on ERP concepts, SAP navigation and organisational units, master data, the P2P and O2C document chain, and 2-D dynamic programming. 15 questions, 25 minutes.
---
Q: Which statement best describes the main benefit of an ERP system?
A) It replaces the need for an accounts department
*B) Business events are recorded once in one integrated system, and every department sees the effect
C) Each department gets its own separate database tuned for its needs
D) It removes the need for any master data
Explanation: Integration on a shared database is the core idea. Departments still exist, and ERP depends heavily on master data.

Q: Why can SAP HANA add up one field across millions of rows quickly?
A) It stores each record on a separate disk
*B) It keeps data in memory and stores it column by column, so a total reads only the column it needs
C) It pre-calculates every possible total every night
D) It only stores the last 12 months of data
Explanation: In-memory storage plus a column store means a total over one field touches only that column.

Q: Which organisational unit represents a legal entity that produces its own balance sheet and P&L?
A) Client
*B) Company code
C) Plant
D) Sales organisation
Explanation: The company code is the legal, financial reporting unit. The client is the top-level data container.

Q: A sales area is made up of which three units?
A) Company code, plant, storage location
B) Client, company code, sales organisation
*C) Sales organisation, distribution channel, division
D) Purchasing organisation, plant, division
Explanation: Customer sales data and pricing are maintained per sales area: sales org + distribution channel + division.

Q: Kaveri keeps returned goods physically separate from saleable stock inside its Bengaluru warehouse. Which unit models this?
A) A second company code
B) A second client
*C) A second storage location in the same plant
D) A second division
Explanation: Storage locations divide stock within a plant. A company code or client would be far too large a split.

Q: A user is in ME21N with unsaved changes and types /nVA03. What happens?
A) The purchase order is saved automatically, then VA03 opens
*B) ME21N is left without saving and VA03 opens in the same session
C) VA03 opens in a new window and ME21N stays open
D) Nothing happens until the user presses F4
Explanation: /n ends the current transaction without saving. /o would open a new session instead.

Q: Which of these are master data? (Select all that apply.)
*A) A supplier business partner
*B) A material record for a 750 W mixer grinder
C) A goods receipt for 100 mixer grinders on 3 March
*D) A G/L account for trade payables
Explanation: Master data describes things and is reused; a goods receipt is a dated business event, so it is transactional data.

Q: In S/4HANA, how are customers and suppliers created?
A) Only with separate customer and vendor transactions, as in older releases
*B) As business partners in transaction BP, with customer and/or supplier roles
C) As G/L accounts in FS00
D) As materials of type HAWA
Explanation: S/4HANA uses the Business Partner as the single entry point; one partner can hold both customer and supplier roles.

Q: Why can nobody post directly to a reconciliation account?
A) Reconciliation accounts are only used in controlling
*B) It is updated automatically from the subledger, which keeps the G/L total equal to the sum of supplier or customer balances
C) It is a statistical account with no balance
D) Direct posting is allowed only on the last day of the year
Explanation: Postings go to the supplier or customer, and SAP updates the reconciliation account at the same time.

Q: Which is the correct order of the Procure-to-Pay documents?
A) Purchase order → purchase requisition → invoice → goods receipt → payment
*B) Purchase requisition → purchase order → goods receipt → invoice verification → payment
C) Purchase requisition → goods receipt → purchase order → payment → invoice
D) Invoice → purchase order → goods receipt → payment
Explanation: The internal request comes first, then the commitment to the supplier, then receipt, invoice check and payment.

Q: In Order-to-Cash, which step creates the first accounting entry?
A) Inquiry
B) Quotation
C) Sales order
*D) Post goods issue
Explanation: Pre-sales documents and the sales order do not post to the ledger. Post goods issue reduces inventory and records the cost of goods sold.

Q: Which three documents are compared in the three-way match? (Select all that apply.)
*A) Purchase order
*B) Goods receipt
*C) Supplier invoice
D) Purchase requisition
Explanation: Invoice verification checks the invoice against what was ordered (PO) and what arrived (GR). The requisition is internal and not part of the match.

Q: In which SAP Activate phase are fit-to-standard workshops run?
A) Prepare
*B) Explore
C) Realize
D) Run
Explanation: Explore compares SAP's standard processes with the business and records the gaps; Realize then configures and builds.

Q: For Unique Paths with dp[r][c] = dp[r-1][c] + dp[r][c-1] and the first row and column set to 1, what is dp[2][2]?
A) 4
*B) 6
C) 9
D) 3
Explanation: Row 1 is 1, 2, 3 and row 2 is 1, 3, 6, so dp[2][2] = 3 + 3 = 6.

Q: In the one-row 0/1 knapsack, why does the capacity loop run from high to low?
A) It is faster because Python lists are reversed internally
*B) So dp[w - weight] still holds the value from before this item was considered, and the item is used at most once
C) Because the largest items must always be placed first
D) It makes no difference; either direction gives the same answer
Explanation: Looping upwards lets dp[w - weight] already include the current item, which turns 0/1 knapsack into unbounded knapsack.
