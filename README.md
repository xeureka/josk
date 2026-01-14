🚀 Multi‑Tenant Credit Purchase Backend
An elegant, server‑focused backend built for safe, concurrent multi‑tenant credit purchases. Designed for correctness, consistency, and robust transactional behavior when handling money, inventory, and credits.

✨ Overview
This repository implements a backend-only system using Next.js (server-side) and PostgreSQL. Multiple businesses (tenants) share the same application and database while keeping their data strictly isolated. The design emphasizes correctness, data integrity, and safe concurrent operations — especially for financial, inventory, and credit flows.

🎯 Key goals
Strong correctness guarantees for financial and inventory operations.
Multi-tenant data isolation with tenant-aware schema and queries.
ACID transactions and row‑level locking to avoid race conditions and overselling.
Full auditability via an append‑only credit ledger (no mutable balances).
🏗 Architecture & Core Concepts
🔁 Transactions
Purchases are executed as a single database transaction touching multiple tables (products, customers, orders, order_items, credit_ledger). Every validation and update happens inside the transaction: if anything fails, the transaction rolls back and no partial data is written.

📌 Invariants
Enforced primarily at the database level:

Product stock must never go below zero.
Customer credit usage must never exceed their credit limit.
Tenants cannot read or modify another tenant's data.
Orders are immutable historical records created only after all validations succeed.
🏢 Multi‑tenancy
Every table includes a business_id column.
All queries and constraints are tenant-aware (use business_id).
Compatible with PostgreSQL Row Level Security (RLS) / Supabase if you opt to add it.
⚖️ Concurrency
Row‑level locks are acquired on customer and product rows before validation and updates. This prevents overselling and over‑crediting without application‑level locks.

📘 Domain Model (Conceptual)
Businesses — tenants; other tables reference business_id.
Customers — belong to a business; have a credit limit and credit activity tracked in the ledger.
Products — belong to a business; have stock and a price. Stock updates are transactional and validated.
Orders — immutable records representing completed purchases.
Order Items — store quantity and purchase‑time price so historical orders remain accurate.
Credit Ledger — append‑only ledger entries track credit usage (positive) and payments (negative). Current balance = sum of ledger entries.
🛒 Purchase Flow (high level)
Start a database transaction.
Lock the customer row to prevent concurrent credit changes.
Lock the product rows to prevent concurrent stock changes.
Validate stock availability and credit limit.
Create the order record.
Insert order_items.
Update product stock.
Insert credit ledger entries.
Commit the transaction.
If any step fails, rollback to keep data consistent.

📂 Folder structure
High-level layout (may evolve):

. ├─ .gitignore
├─ README.md
├─ bun.lock
├─ docker-compose.yml
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tsconfig.json
└─ src/
├─ app/ # Next.js server routes and handlers (server-only)
├─ db/ # Database connection, queries and transaction helpers
├─ lib/ # Shared utilities and helpers
└─ types/ # TypeScript types and domain definitions

🧰 Tech stack
Language: TypeScript
Server: Next.js (server / API layer only)
Database: PostgreSQL (transactions, constraints, row‑level locks)
Containerization: Docker / Docker Compose
Tooling: Bun, ESLint
🔒 Design Decisions (Why this approach?)
Use the database for correctness: constraints, transactions, and row locks provide fewer failure modes than distributed app locks.
Ledger-based accounting avoids fragile mutable balances and gives a reproducible audit trail.
Tenant-aware schemas + business_id minimize leakage risk and are straightforward to combine with RLS for even stronger isolation.
Immutable orders preserve historical correctness for reporting and reconciliation.
📦 Notes & Next steps
No frontend is included — purposefully server-only.
The system favors correctness and auditability over premature optimization.
If you enable RLS or Supabase, ensure application queries still include business_id filters or use auth-bound policies.
Note: The repository includes a bare .sql schema/migrations. Consider improving safety, maintainability, and developer ergonomics by using a query builder or an ORM (for example: Knex, Prisma, TypeORM, or Objection). These tools help produce composable, type-safe queries, manage migrations, and reduce raw SQL surface area.
