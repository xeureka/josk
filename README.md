Multi-Tenant Credit Purchase Backend

Next.js (Server-Side) + PostgreSQL

What This Project Is

I am building a backend-only system where customers purchase products on credit.
Each purchase affects multiple pieces of data at the same time, and the system must remain correct even when multiple requests happen concurrently.

This is a multi-tenant system. Multiple businesses use the same backend and database, but their data must remain completely isolated from one another.

There is no frontend. The focus is entirely on correctness, data integrity, and safe concurrent behavior.

The Core Problem I Am Solving

This system has several non-trivial constraints:

Money and credit are involved, so inconsistencies are unacceptable

Inventory is involved, so race conditions are dangerous

Multiple tenants share the same database

Multiple purchases can happen at the same time

Because of this, my main responsibility is to preserve correctness first and worry about performance second.

PostgreSQL is a good fit here because it provides strong consistency, ACID transactions, row-level locking, and rich constraint support.

Concepts This System Is Built On
Transactions

A single purchase is one logical operation, but it touches multiple tables:

products

customers

orders

order_items

credit ledger

All of these changes must either succeed together or fail together.
To guarantee this, every purchase is executed inside a single database transaction.

If any step fails, the transaction is rolled back and no partial data is written.

Invariants

I define rules that must never be broken:

Product stock must never go below zero

Customer credit usage must never exceed the credit limit

One business must never read or modify another business’s data

Orders must represent completed facts, not intentions

These rules are enforced primarily at the database level using constraints and transactional logic, not just application code.

Multi-Tenancy

This system uses one shared database for all businesses.

To keep data isolated:

Every table includes a business_id

Every query explicitly filters by business_id

Composite constraints include business_id where appropriate

This ensures that every row belongs to exactly one business and that cross-tenant access is not possible.

When using Supabase, this model is compatible with Row Level Security as an additional safety layer.

Concurrency

The hardest problems in this system come from concurrent purchases.

Two purchases happening at the same time can cause:

Overselling stock

Exceeding customer credit limits

Inconsistent balances

I solve this using PostgreSQL row-level locks.

Instead of checking values and then updating them, I lock the relevant rows first and then validate them. This guarantees that once validation passes, the data cannot change underneath the transaction.

Schema Design (Conceptual)
Businesses

This table represents tenants.
Every other table references a business.
It is the root of data isolation.

Customers

Customers belong to exactly one business.

Each customer has:

a credit limit

credit usage tracked through a ledger

A customer from one business can never affect another business.

Products

Products belong to one business.

Each product has:

stock

price

Stock must never go negative. This is enforced through transactional updates and validation under row-level locks.

Orders

Orders represent completed purchases.

They are immutable historical records created only after all validation succeeds.

Orders reflect reality, not intent.

Order Items

Order items represent the individual products in an order.

They store:

quantity

price at the time of purchase

The purchase-time price is stored explicitly so future price changes do not affect historical orders.

Credit Ledger

Instead of storing a mutable balance, I use a ledger.

Each credit-related change is recorded as a row:

Positive amounts represent credit usage

Negative amounts represent payments

The current balance is computed as the sum of ledger entries.

This approach provides auditability, correctness, and safety under concurrency.

Purchase Flow

The purchase endpoint follows a strict sequence:

Start a database transaction

Lock the customer row to prevent concurrent credit usage

Lock the product rows to prevent concurrent stock changes

Validate stock availability and credit limit

Create the order

Insert order items

Update product stock

Record credit usage in the ledger

Commit the transaction

If any step fails, the transaction is rolled back and no data is written.

Why This Works Under Load

PostgreSQL guarantees that only one transaction can hold a lock on a row at a time.

Other transactions wait instead of corrupting data.

This prevents:

overselling

over-crediting

partial writes

No external locks or application-level synchronization are required.

Overdue Customers

Overdue status is not stored.

A customer is considered overdue if:

they have a positive outstanding balance

their oldest unpaid credit entry is older than 30 days

This is computed using a query over the credit ledger.

This approach ensures overdue status is always accurate and derived from source-of-truth data.

How Next.js Is Used

Next.js is used strictly as a server-side API layer.

Its responsibilities are:

validating input

extracting tenant context

starting database transactions

executing SQL logic

returning responses

It does not handle:

concurrency control

balance calculations

business rule enforcement

Those responsibilities belong to PostgreSQL.
