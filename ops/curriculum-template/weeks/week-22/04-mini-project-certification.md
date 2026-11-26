---
type: notes
title: "W22 · S4 · Mini Project 5 and Planning an SAP Certification Path"
slug: w22-s4-mini-project-certification
topic: MP5 & SAP Certification
subject: career
minutes: 30
description: How to write and present the end-to-end SAP process document for Kaveri Home Appliances Ltd, what to put in the "what could go wrong" section, and how to choose an SAP Certified Associate path using learning.sap.com.
---
# Mini Project 5 and planning an SAP certification path

Phase 5 ends with one document that proves you can explain an SAP process end to end: **Mini Project 5 (MP5), the SAP
End-to-End Process Document** for Kaveri Home Appliances Ltd. It is individual work, and you present it in this
session. A clear process document is also the most common artefact a junior functional consultant produces, so treat
it as a portfolio piece.

## What the document must contain

The full brief and rubric are in the MP5 project item. In summary, `week-22/process-document.pdf` in your
`sap-kaveri-case` repository, 10–15 pages:

| # | Section | What good looks like |
|---|---|---|
| 1 | Company background and org structure | One paragraph on Kaveri, then the org units you used with their codes and a diagram |
| 2 | Master data | Tables or screenshots of the business partners, materials and G/L accounts used |
| 3 | Procure-to-Pay | Each step: screenshot, document number, who does it, accounting entry (or "none") |
| 4 | Order-to-Cash | The same format, from inquiry or quotation to incoming payment |
| 5 | Integration | Document flow screenshots and a table of MM–FI and SD–FI postings with accounts |
| 6 | What could go wrong | One page of risks and the SAP control for each |
| 7 | Certification path | Which SAP Certified Associate track fits you and why |

Commit the source file (DOCX) as well, **one commit per section**, so your version history shows the document being
built. Write commit messages the way you learned in Week 1: "Add P2P section with document numbers".

## Writing each process step

Use the same structure for every step so that a reader can compare them. A template:

```text
Step 3 – Goods receipt
Who:              Stores (warehouse clerk)
Transaction:      MIGO, movement type 101, with reference to PO 4500000123
Document created: Material document 5000000456 (and accounting document)
What happens:     100 mixer grinders received into plant KB01, storage location 0001
Accounting entry: Dr Inventory – trading goods ₹2,50,000 / Cr GR/IR clearing ₹2,50,000
Screenshot:       Figure 7
```

(The numbers above are illustrative; use the real numbers from your system or worksheet.)

Tips:

- **Number every figure** and refer to it in the text.
- **Crop screenshots** to the relevant area and highlight the document number.
- **Explain in business language first**, then the SAP detail. "Stores confirms the goods arrived" before "MIGO 101".
- If you used the scenario worksheet instead of a live system, say so in the introduction and use worksheet tables in
  place of screenshots.

## The "what could go wrong" page

This section shows you understand **why** the process is designed the way it is. Pick four to six risks and explain the
SAP control for each.

| Risk | What could happen | How SAP controls it |
|---|---|---|
| Goods receipt without a PO | Stock arrives that nobody ordered or at an unknown price | Receipts are posted with reference to a PO; unplanned receipts can be restricted by movement type and authorisation |
| Invoice price higher than agreed | Kaveri overpays the supplier | Three-way match in `MIRO`; differences outside tolerance block the invoice for payment |
| Invoice for goods never received | Paying for nothing | Invoice quantity checked against goods receipt; blocked if higher |
| Customer over their credit limit | Bad debt | Credit check blocks the sales order or delivery until a credit controller releases it |
| Posting into a closed month | Reported figures change after the fact | Posting periods are closed by finance |
| Duplicate supplier invoice | Paying twice | Duplicate invoice check on supplier, reference and amount |
| One person creates the supplier and pays it | Fraud | Segregation of duties through roles and authorisations |

## Presenting in five minutes

| Minute | Content |
|---|---|
| 0–1 | Kaveri in one sentence; your org structure diagram |
| 1–2 | P2P: the chain of documents with numbers, one accounting entry explained |
| 2–3 | O2C: the chain of documents, the PGI and billing entries |
| 3–4 | Integration: the document flow screenshot and your postings table |
| 4–5 | One risk and its control; your certification plan |

Expect viva questions such as "Why is GR/IR zero now?", "Which step created the first accounting entry in O2C?" or
"Where did this inventory account come from?". If you can answer from your own postings table, you are ready.

## Planning an SAP certification path

SAP's entry-level certifications are called **SAP Certified Associate**. They are organised by solution area, and the
exams for S/4HANA cover topics such as financial accounting, management accounting, sourcing and procurement, and
sales. There are also associate certifications for technical areas such as ABAP development and for SAP's cloud and
integration products.

| If you enjoyed… | Look at associate paths around… |
|---|---|
| Week 21: postings, ledgers, period-end close | Financial accounting in S/4HANA |
| Cost centres, profit centres, allocations | Management accounting (controlling) in S/4HANA |
| Week 22 P2P: purchasing, goods receipt, invoice verification | Sourcing and procurement in S/4HANA |
| Week 22 O2C: pricing, delivery, billing | Sales in S/4HANA |
| The programming side of the course | ABAP development or SAP's cloud development and integration paths |

Important points before you decide:

- **Exam names and codes change regularly.** Always check the current list on **learning.sap.com** before choosing,
  and confirm with your tutor. Do not rely on lists in old blog posts or videos.
- **learning.sap.com** offers free learning journeys for many topics. Start with the journey linked to the
  certification you are considering, and finish one before booking anything.
- Each certification page lists the topic areas and their weightings. Use it as a checklist against what you covered in
  Weeks 20–22.
- A certification is one signal among several. Your MP5 document, your ability to explain postings in an interview and
  your DSA and project work all matter too.

## Lab: present the process document

1. Finish the seven sections and export the PDF. Check that every document number in the text matches a screenshot or
   worksheet table.
2. Commit the DOCX and PDF with one commit per section.
3. Present for five minutes using the plan above, then take two questions.
4. In your progress tracker, record your chosen certification track, the learning journey you will start, and a target
   month.

## Check yourself

1. Why does each process step in your document need both the business description and the SAP document number?
2. Pick one risk from the table and explain the SAP control in two sentences, as you would in a viva.
3. Where must you check the current SAP certification exam list, and why not rely on older sources?
