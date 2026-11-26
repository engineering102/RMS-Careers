---
type: notes
title: "W20 · S2 · Navigating SAP and the Organisational Structure"
slug: w20-s2-navigation-org-structure
topic: SAP Navigation & Org Units
subject: career
minutes: 35
description: Find your way around SAP GUI and the Fiori launchpad with transaction codes and favourites, then learn the organisational units every process is built on, from client and company code to sales and purchasing organisation.
---
# Navigating SAP and the organisational structure

Two skills make every later SAP lab easier: moving around the system quickly, and knowing **which organisational
unit** a screen is asking you for. This session covers both.

## Two user interfaces

S/4HANA offers two ways in. Most companies use both.

| | SAP GUI | SAP Fiori launchpad |
|---|---|---|
| What it is | A desktop client (also available in the browser) with the classic SAP screens | A browser-based home page of **tiles**, each opening one app |
| How you start a task | Type a **transaction code** or use the menu tree | Click a tile, or search for an app |
| Strengths | Fast for experienced users; every classic transaction is there | Role-based, simpler screens, works on tablets, shows live numbers on tiles |
| Who uses it most | Consultants, power users, support teams | Business users: buyers, sales staff, accountants, managers |

A **role** decides which tiles a Fiori user sees. A purchasing clerk sees purchase order apps; an accountant sees
journal entry apps. The same idea controls what each user is allowed to do.

## SAP GUI: transaction codes

A **transaction code (T-code)** is a short name for a screen. You type it in the **command field** at the top left.

| You type | What happens |
|---|---|
| `ME21N` | Opens Create Purchase Order in the current window |
| `/nVA01` | Leaves the current transaction and opens Create Sales Order |
| `/oMIGO` | Opens the goods movement transaction in a **new** session (window) |
| `/n` | Ends the current transaction and returns to the start screen |

Unsaved data is lost when you use `/n` to leave a screen, so save first.

Many classic T-codes follow a pattern: the last digit often means **01 create, 02 change, 03 display**.

| Object | Create | Change | Display |
|---|---|---|---|
| Material master | `MM01` | `MM02` | `MM03` |
| Sales order | `VA01` | `VA02` | `VA03` |
| Business partner | `BP` (one transaction for all three) | | |

Newer "enjoy" transactions end in **N** (for example `ME21N`, `MIGO`, `VL01N`) and combine create, change and display
in one screen.

## Getting comfortable

- **Favourites**: in SAP GUI, right-click **Favorites** in the menu tree to add a transaction. In Fiori, pin an app
  to your home page or a group. Add the 8–10 transactions you use this phase.
- **Show T-codes in the menu**: SAP GUI has a setting under **Extras → Settings** to display technical names next to
  menu entries. Switch it on; it is the fastest way to learn codes.
- **Own user data**: transaction `SU3` lets you set defaults such as date format, decimal notation and default values
  for fields you fill repeatedly.
- **F1 and F4**: on any field, **F1** explains what the field means and **F4** lists the allowed values. Use them
  before guessing.
- **Status bar**: messages appear at the bottom of the screen. Green is success (often with a document number), yellow
  is a warning, red is an error that stops you. Always read it after saving.

## The organisational structure

Before SAP can record a single transaction, the company's structure must be defined. These **organisational units**
(org units) are set up once during the project and rarely change. Every document you create refers to them.

### The core units

| Unit | What it represents | Belongs to | Key size |
|---|---|---|---|
| **Client** | The top level: one self-contained set of data in the system. Typically a whole corporate group | — | 3 digits |
| **Company code** | A legal entity that produces its own balance sheet and P&L | Client | 4 characters |
| **Plant** | A location where goods are produced, stored or distributed (factory, warehouse, depot) | One company code | 4 characters |
| **Storage location** | A place inside a plant where stock is kept (main store, returns area) | One plant | 4 characters |
| **Purchasing organisation** | The unit that negotiates with suppliers and is responsible for purchasing | Plants it buys for | 4 characters |
| **Purchasing group** | The buyer or team of buyers handling a set of materials | — | 3 characters |
| **Sales organisation** | The unit responsible for selling, with its own terms and liability | One company code | 4 characters |
| **Distribution channel** | How goods reach customers: wholesale, retail, online | Combined with sales org | 2 characters |
| **Division** | A product line: for example kitchen appliances or fans | Combined with sales org | 2 characters |
| **Shipping point** | Where deliveries are processed and dispatched | Plant | 4 characters |

Three of these together form a **sales area**: **sales organisation + distribution channel + division**. Customer
sales data and pricing are kept per sales area.

### Data separation by client

Data such as customers, materials and documents is stored **per client**. A company typically has separate clients
for development, testing and production, so trainees can practise without touching live data. Your training system
gives you a client number when you log in.

### How the units fit together

```text
Client
└── Company code  (legal entity, own books)
    ├── Plant  (warehouse / factory)
    │   ├── Storage location
    │   └── Shipping point
    └── Sales organisation
        └── Sales area = sales org + distribution channel + division

Purchasing organisation  → assigned to the plants it buys for
```

## Kaveri Home Appliances Ltd: a worked org structure

Kaveri is one legal entity with a warehouse in Bengaluru, selling kitchen appliances and fans to retailers and online.
One reasonable design (the codes are illustrative; your training system will have its own):

| Unit | Example value | Why |
|---|---|---|
| Company code | `KV01` Kaveri Home Appliances Ltd | One legal entity, one set of books |
| Plant | `KB01` Bengaluru distribution centre | The only stockholding location |
| Storage locations | `0001` main store, `0002` returns | Keeps returned goods separate from saleable stock |
| Purchasing organisation | `KP01` Kaveri purchasing | One central buying team |
| Sales organisation | `KS01` Kaveri sales | One selling unit |
| Distribution channels | `10` retail dealers, `20` online | Different prices and terms per channel |
| Divisions | `01` kitchen appliances, `02` fans | Different product lines and sales managers |

Design rule of thumb: **create an org unit only when the business needs a separate result, rule or responsibility**.
Every extra unit adds data to maintain for every customer and material.

## Lab: navigation exercise

Work in the training system, or in the tutor's guided simulation if your college has no system access yet.

1. Log on and note the client number. Switch on technical names in the menu.
2. Add these to your favourites: `MM03`, `BP`, `ME21N`, `MIGO`, `VA01`, `VL01N`, `VF01`, `FB50`.
3. Open `MM03`, press **F4** on the material field and find any material. Display it and note which views exist.
4. Use `/o` to open a second session and `/n` to leave a transaction. Note what happens to unsaved data.
5. Open the Fiori launchpad, search for an app by name, and pin it.
6. Take a screenshot of each step with a one-line caption. This starts your **navigation log** for the weekly build.

## Check yourself

1. What is the difference between a company code and a plant?
2. Name the three units that form a sales area.
3. You type `/oVA03` while inside `ME21N`. What happens?
