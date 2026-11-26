---
type: quiz
title: "W21 · Weekly Test: SAP Finance (FI) and Controlling (CO)"
slug: w21-weekly-test
topic: Week 21 Assessment
subject: career
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on debits and credits, the FI structure, accounts payable and receivable, CO objects, FI–CO integration, financial reports, bit manipulation and tries. 15 questions, 25 minutes.
---
Q: Kaveri pays ₹18,000 office rent from its bank account. Which entry is correct?
*A) Dr Rent expense ₹18,000, Cr Bank ₹18,000
B) Dr Bank ₹18,000, Cr Rent expense ₹18,000
C) Dr Rent expense ₹18,000, Dr Bank ₹18,000
D) Cr Rent expense ₹18,000, Cr Bank ₹18,000
Explanation: An expense increases with a debit; the bank (an asset) decreases with a credit. Debits must equal credits.

Q: Which accounts increase with a credit? (Select all that apply.)
*A) Trade payables
*B) Sales revenue
C) Inventory
*D) Share capital
Explanation: Liabilities, revenue and equity increase with a credit. Inventory is an asset, which increases with a debit.

Q: Kaveri uses an April–March fiscal year with 12 normal periods. In which period is a document posted on 20 July?
A) Period 7
*B) Period 4
C) Period 3
D) Period 13
Explanation: April is period 1, so July is period 4. Periods 13–16 are special periods for year-end adjustments.

Q: What does the document type of an accounting document control?
A) Only the colour of the document on screen
*B) Its number range and which account types it can post to
C) The fiscal year variant of the company code
D) The currency of the controlling area
Explanation: Document types such as SA, KR and DZ classify documents and control number ranges and allowed account types.

Q: Which posting key is used to credit a supplier when posting an invoice?
A) 40
B) 25
*C) 31
D) 01
Explanation: 31 credits a supplier (invoice). 25 debits a supplier (payment), 40 debits a G/L account and 01 debits a customer.

Q: A supplier invoice has been posted but not paid. Which statement is true?
*A) It is an open item on the supplier account, and the trade payables reconciliation account includes it
B) It appears only in controlling, not in FI
C) It is a cleared item until the due date
D) It is not visible in any report until payment
Explanation: Unpaid invoices are open items. When the payment is posted against it, both become cleared items.

Q: Kaveri receives ₹12,000 from a customer for an invoice posted last month. Which entry is posted?
A) Dr Customer, Cr Bank
*B) Dr Bank, Cr Customer
C) Dr Revenue, Cr Customer
D) Dr Customer, Cr Revenue
Explanation: The bank increases (debit) and the amount the customer owes decreases (credit), clearing the open invoice.

Q: What is the Universal Journal in S/4HANA?
A) A Fiori app for writing comments on invoices
*B) One line-item table (ACDOCA) that holds financial accounting, controlling and asset accounting postings together
C) A report that prints all journal entries at year end
D) A separate database used only for controlling
Explanation: ACDOCA combines G/L and CO details on each line, so FI and CO no longer need to be reconciled.

Q: In S/4HANA, what is a primary cost element?
A) A separate CO master record unrelated to the G/L
*B) A P&L G/L account whose postings from FI also flow to controlling objects
C) A balance sheet account such as Bank
D) An account used only for allocations within CO
Explanation: Cost elements are G/L accounts in S/4HANA. Secondary cost elements are the ones used only inside CO.

Q: Kaveri wants to collect all costs of a three-week festive promotion in one place and move them to the sales cost centre afterwards. Which CO object fits?
A) A profit centre
*B) An internal order, settled at the end of the campaign
C) A new company code
D) A storage location
Explanation: Internal orders collect costs for a time-limited activity and are settled to a permanent receiver.

Q: An electricity bill of ₹42,000 is posted with Dr Electricity expense and cost centre KBWH. Where does it appear? (Select all that apply.)
*A) In the G/L balance of the electricity expense account
*B) In the actual costs of cost centre KBWH
*C) In the profit centre assigned to KBWH
D) In the customer subledger
Explanation: One Universal Journal line carries the G/L account, the cost centre and its profit centre. No customer is involved.

Q: Which statement about the balance sheet and the P&L is correct?
A) Both show performance over a period
*B) The balance sheet shows a position at a date; the P&L shows performance over a period
C) The P&L contains asset and liability accounts
D) The balance sheet contains only revenue accounts
Explanation: The balance sheet holds asset, liability and equity accounts at a date; the P&L holds revenue and expenses for a period.

Q: Why does finance close the previous posting period after the month-end close?
A) To delete the documents of that month
B) To start depreciation
*C) To stop back-dated postings changing numbers that have already been reported
D) To move all balances to retained earnings
Explanation: Closed periods prevent accidental postings into a month that has been reported. Carrying forward happens at year end.

Q: In Python, what does print(5 ^ 3, 6 & 5) output?
A) 125 4
*B) 6 4
C) 2 7
D) 8 11
Explanation: 5 ^ 3 is 101 XOR 011 = 110 = 6 (^ is XOR, not power). 6 & 5 is 110 AND 101 = 100 = 4.

Q: A trie holds the words "car", "cart" and "cat". What do search("ca") and startsWith("ca") return?
A) True, True
*B) False, True
C) True, False
D) False, False
Explanation: The path c-a exists, so startsWith is True, but no word ends at "ca", so search is False.
