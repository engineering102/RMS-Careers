---
type: quiz
title: "Phase 5 Test: SAP S/4HANA"
slug: phase-5-test
topic: Phase 5 Assessment
subject: career
quizType: formal
timeLimit: 45
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt phase test covering Weeks 20–22: ERP and SAP basics, organisational units and master data, FI and CO, Procure-to-Pay, Order-to-Cash, integration, and the DSA patterns of the phase. 30 questions, 45 minutes.
---
Q: A company's sales, stores and accounts teams each keep their own records, and month-end takes days of reconciliation. What is the main thing an ERP system changes?
A) It adds a reporting tool on top of the existing spreadsheets
*B) It records each business event once in one integrated system, so all departments work from the same data
C) It gives every department a faster separate database
D) It removes the need for an accounts team
Explanation: Integration on shared data removes re-entry and reconciliation between departmental systems.

Q: Which statement about SAP S/4HANA is correct?
A) It runs on any major third-party database, like ECC
*B) It runs only on the SAP HANA database and uses a simplified data model
C) It is the same product as R/3 with a new name
D) It can only be deployed in SAP's public cloud
Explanation: S/4HANA is built for HANA only. It can be deployed on-premise, in a private cloud or in the public cloud.

Q: Which deployment option gives the customer the most control over modifications, at the cost of running more of the system themselves?
*A) On-premise
B) Public cloud
C) Private cloud with no extensions allowed
D) All options give the same control
Explanation: On-premise gives full control; the public cloud trades flexibility for standard processes and regular updates.

Q: Match the unit to its definition: which organisational unit is a location where goods are stored or distributed and is assigned to one company code?
A) Client
B) Sales organisation
*C) Plant
D) Division
Explanation: A plant is a factory, warehouse or depot, assigned to exactly one company code.

Q: Which organisational units belong to logistics rather than to financial accounting? (Select all that apply.)
*A) Storage location
*B) Purchasing organisation
*C) Distribution channel
D) Company code
Explanation: The company code is the financial legal entity. Storage locations, purchasing organisations and distribution channels are logistics units.

Q: In SAP GUI, what does typing /oMIGO in the command field do?
A) Closes all sessions and opens MIGO
*B) Opens MIGO in a new session, leaving the current one open
C) Displays the documentation for MIGO
D) Opens MIGO in display-only mode
Explanation: /o opens a new session; /n replaces the current transaction.

Q: A retailer both buys returned stock from Kaveri and sells spare parts to it. How is this modelled in S/4HANA?
A) Two unrelated records: one in a customer table and one in a vendor table
*B) One business partner with both customer and supplier roles
C) A G/L account with two reconciliation accounts
D) Two company codes
Explanation: The Business Partner model lets one organisation hold several roles while sharing general data such as the address.

Q: Kaveri buys and resells ceiling fans without processing them. Which material type is most appropriate?
A) FERT (finished product)
B) ROH (raw material)
*C) HAWA (trading goods)
D) A G/L account
Explanation: Trading goods are bought and resold without processing. FERT and ROH relate to production.

Q: Which of these are transactional data? (Select all that apply.)
*A) A sales order for 50 mixer grinders
B) The customer business partner Sharma Electricals
*C) An outgoing payment to a supplier
D) The G/L account "Sales revenue"
Explanation: Transactional data records dated business events. Business partners and G/L accounts are master data.

Q: Kaveri's owners put ₹5,00,000 of capital into the company bank account. Which entry is correct?
A) Dr Share capital, Cr Bank
*B) Dr Bank, Cr Share capital
C) Dr Bank, Cr Sales revenue
D) Dr Share capital, Cr Trade payables
Explanation: The bank (asset) increases with a debit; equity increases with a credit.

Q: With an April–March fiscal year, which posting period contains a document posted on 10 January?
A) Period 1
B) Period 4
*C) Period 10
D) Period 13
Explanation: April is period 1, so January is period 10. Periods 13–16 are special periods.

Q: Which posting key pair is used for a manual G/L journal entry?
*A) 40 debit and 50 credit
B) 01 debit and 11 credit
C) 31 credit and 25 debit
D) 15 credit and 21 debit
Explanation: 40 and 50 are G/L debit and credit. The others are customer or supplier posting keys.

Q: Why can a supplier invoice not be posted straight to the "Trade payables" reconciliation account?
A) Reconciliation accounts are only for customers
*B) The posting goes to the supplier, and SAP updates the reconciliation account automatically so the subledger and G/L always agree
C) Trade payables is a P&L account
D) Reconciliation accounts can only be posted at year end
Explanation: Reconciliation accounts are updated only through subledger postings, which keeps the G/L and subledger totals equal.

Q: A supplier invoice for freight (₹25,000, no purchase order) is posted in FI. Which entry results?
A) Dr Supplier, Cr Freight expense
*B) Dr Freight expense, Cr Supplier
C) Dr GR/IR, Cr Supplier
D) Dr Bank, Cr Freight expense
Explanation: The expense increases (debit) and the amount owed to the supplier increases (credit). GR/IR is only used with PO-based goods receipts.

Q: What happens to the open invoice when the matching outgoing payment is posted against it?
A) It is deleted
*B) The invoice and payment become cleared items linked by a clearing document
C) It is moved to controlling
D) It stays open until year end
Explanation: Clearing links the invoice and the payment; both stay visible as cleared items.

Q: Which benefit comes from the Universal Journal (ACDOCA)?
A) Customers can see Kaveri's ledger online
*B) FI and CO details sit on the same line items, so the two no longer need reconciling
C) Every posting is printed automatically
D) It replaces the need for a chart of accounts
Explanation: One line-item table for FI, CO, asset accounting and material ledger gives a single source of truth.

Q: Which CO object is best for measuring the profitability of Kaveri's fans product line?
A) A storage location
B) An internal order
*C) A profit centre
D) A posting period
Explanation: Profit centres carry both revenue and costs, giving a mini P&L for a product line, region or channel.

Q: Kaveri moves part of its warehouse cost centre's costs to the two sales cost centres at month end, using a secondary cost element. What is this called?
A) Settlement of an internal order
*B) Assessment
C) Depreciation
D) Clearing
Explanation: Assessment allocates costs between CO objects using a secondary cost element. Distribution keeps the original primary cost elements.

Q: Which statements about period-end close are correct? (Select all that apply.)
*A) Depreciation is run to charge the period's share of fixed asset costs
*B) The GR/IR account is reviewed for goods received but not invoiced
C) Closing a period deletes its documents
*D) The old posting period is closed to stop back-dated postings
Explanation: Closing a period blocks new postings into it; existing documents are kept.

Q: In P2P, which document is a legal commitment sent to the supplier?
A) Purchase requisition
*B) Purchase order
C) Material document
D) Invoice receipt
Explanation: The purchase order states quantity, price and terms and is sent to the supplier. The requisition is internal.

Q: Which step performs the three-way match, and which documents does it compare?
A) Goods receipt: PR, PO and invoice
*B) Invoice verification: PO, goods receipt and invoice
C) Payment run: invoice, payment and bank statement
D) Purchase order: PR, quotation and info record
Explanation: MIRO compares what was ordered, what was received and what was invoiced.

Q: Which movement types are used for a goods receipt against a purchase order and a goods issue for a customer delivery?
*A) 101 and 601
B) 601 and 101
C) 201 and 261
D) 311 and 101
Explanation: 101 is goods receipt for a PO; 601 is goods issue for a delivery.

Q: Put the O2C steps in the correct order.
A) Sales order → billing → delivery → post goods issue → payment
*B) Quotation → sales order → delivery → post goods issue → billing → payment
C) Delivery → sales order → billing → post goods issue → payment
D) Quotation → billing → sales order → delivery → payment
Explanation: Billing usually references the delivery after goods issue; payment comes last.

Q: Kaveri sells 50 mixers at ₹3,600 each. Which entry does the billing document post in FI (tax ignored)?
A) Dr Cost of goods sold ₹1,80,000, Cr Inventory ₹1,80,000
*B) Dr Customer ₹1,80,000, Cr Sales revenue ₹1,80,000
C) Dr Bank ₹1,80,000, Cr Customer ₹1,80,000
D) Dr Sales revenue ₹1,80,000, Cr Customer ₹1,80,000
Explanation: Billing creates the receivable and the revenue. The bank entry comes with the incoming payment.

Q: A new sales order would take a customer's exposure above its credit limit. What happens in the standard credit management process?
A) The order is deleted
*B) The order is blocked until a credit controller reviews and releases or rejects it
C) The price is increased automatically
D) The order is billed immediately to reduce exposure
Explanation: Credit checks block risky orders for review rather than deleting them.

Q: A material with the wrong valuation class is received from a supplier. What is the most likely effect?
A) The goods receipt is posted to the wrong plant
*B) The inventory posting goes to the wrong G/L account, because automatic account determination uses the valuation class
C) The supplier is paid twice
D) The sales price changes
Explanation: Valuation class + transaction key (BSX) determine the inventory account, so master data errors become accounting errors.

Q: For the 2-D DP problem Unique Paths on a 3 × 3 grid (moves right or down only), how many paths reach the bottom-right cell?
A) 4
*B) 6
C) 9
D) 3
Explanation: Rows fill as 1 1 1, then 1 2 3, then 1 3 6, so the answer is 6.

Q: Which recurrence is correct for Longest Common Subsequence when a[i-1] != b[j-1]?
A) dp[i][j] = dp[i-1][j-1] + 1
*B) dp[i][j] = max(dp[i-1][j], dp[i][j-1])
C) dp[i][j] = dp[i-1][j] + dp[i][j-1]
D) dp[i][j] = 0
Explanation: Without a match, drop one character from either string and keep the better result. The +1 diagonal case applies only on a match.

Q: Every number in an array appears twice except one. Which approach finds it in O(n) time and O(1) extra space?
A) Sort the array and binary search
B) Store counts in a hash map
*C) XOR all the numbers together
D) Use a trie of the numbers
Explanation: x ^ x = 0 and x ^ 0 = x, so pairs cancel and the single value remains. A hash map needs O(n) space.

Q: Why is a trie a good fit for "return true if any stored word starts with this prefix"?
A) It sorts the words alphabetically in O(1)
*B) Words sharing a prefix share a path, so the check is one walk of length equal to the prefix
C) It uses less memory than any other structure in every case
D) It stores each word as a single number
Explanation: Following the prefix one character at a time takes O(length of prefix), however many words are stored.
