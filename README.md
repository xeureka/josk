# Multi-Tenant Credit Purchase Backend (josk)

An elegant, server-focused backend that ensures data integrity and safe concurrent behavior for multi-tenant credit purchases.

Overview

This repository implements a backend-only system built with Next.js (server-side) and PostgreSQL. It is designed for multiple businesses (tenants) to share the same application and database while keeping their data strictly isolated. The main focus is correctness, consistency, and safety under concurrent operations — especially when handling money, inventory, and credit.

Key goals

- Strong correctness guarantees for financial and inventory operations.
- Multi-tenant data isolation with tenant-aware schema and queries.
- ACID transactions and row-level locking to avoid race conditions and overselling.
- Auditability through a credit ledger instead of mutable balances.

Highlights

- No frontend — Next.js is used as an API/server layer only.
- PostgreSQL is used for its transactional guarantees, constraints, and row-level locks.
- Designed to handle concurrent purchases safely.

Architecture & Core Concepts

Transactions

Each purchase is executed as a single database transaction that touches multiple tables (products, customers, orders, order_items, credit_ledger). Every step must succeed for the entire transaction to commit. If any validation fails, the transaction rolls back and no partial data is written.

Invariants

The system enforces these invariants primarily at the database level:

- Product stock must never go below zero.
- Customer credit usage must never exceed their credit limit.
- Tenants cannot read or modify another tenant's data.
- Orders are immutable historical records created only after all validations succeed.

Multi-tenancy

- All tables include a business_id column.
- Every query and constraint is tenant-aware (uses business_id).
- This model is compatible with Row Level Security (RLS) in PostgreSQL/Supabase if you choose to add it.

Concurrency

Concurrent purchases are handled by acquiring row-level locks on customer and product rows before validation and updates. This prevents overselling and over-crediting without requiring application-level locks.

Domain Model (Conceptual)

- Businesses: tenants in the system. Other tables reference business_id.
- Customers: belong to a business; each has a credit limit and credit activity tracked in the ledger.
- Products: belong to a business; each product has stock and a price. Stock updates are transactional and validated.
- Orders: immutable records representing completed purchases.
- Order Items: store quantity and the purchase-time price so historical orders remain accurate.
- Credit Ledger: append-only ledger entries track credit usage (positive) and payments (negative). The current balance is computed by summing ledger entries.

Purchase Flow (high level)

1. Start a database transaction.
2. Lock the customer row to prevent concurrent credit changes.
3. Lock the product rows to prevent concurrent stock changes.
4. Validate stock availability and credit limit.
5. Create the order record.
6. Insert order_items.
7. Update product stock.
8. Insert credit ledger entries.
9. Commit the transaction.

If any step fails, rollback to keep data consistent.

Folder structure

The following is the high-level project layout. Files and directories may change; this represents the current organization in the repository root.

.
├─ .gitignore
├─ README.md
├─ bun.lock
├─ docker-compose.yml
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tsconfig.json
└─ src/
   ├─ app/        # Next.js server routes and handlers (server-only)
   ├─ db/         # Database connection, queries and transaction helpers
   ├─ lib/        # Shared utilities and helpers
   └─ types/      # TypeScript types and domain definitions

Tech stack

- Language: TypeScript
- Server: Next.js (used as a server/API layer)
- Database: PostgreSQL (ACID transactions, row-level locking)
- Containerization: Docker / Docker Compose
- Tooling: Bun (lock file detected), ESLint, PostCSS

Running with Docker Compose

This repository includes a docker-compose.yml to run a local PostgreSQL instance. The compose file exposes PostgreSQL at host port 5433 and defines the default database user, password, and database name.

Defaults (from docker-compose.yml):
- POSTGRES_USER: postgres
- POSTGRES_PASSWORD: postgres
- POSTGRES_DB: next_backend
- Host port: 5433 → Container port: 5432

Start PostgreSQL with:

```bash
# from repository root
docker compose up -d
```

This command will:
- Pull the postgres:16 image (if not available locally).
- Create and start the container named next_pg.
- Create a persistent Docker volume `pgdata` to retain database files.

Useful Docker commands

- Follow logs: docker compose logs -f postgres
- Stop and remove containers: docker compose down
- Remove volumes (data): docker compose down -v
- Inspect container: docker compose ps

Database access

Once the container is running you can connect using psql, pgAdmin, or any PostgreSQL client at:
- Host: localhost
- Port: 5433
- Database: next_backend
- User: postgres
- Password: postgres

Development (local)

1. Clone the repository:
   git clone https://github.com/xeureka/josk.git
2. Install dependencies using your package manager of choice. This project contains a bun.lock file which indicates Bun may be used, but npm/yarn/pnpm are also likely to work.
   - bun install
   - or npm install
   - or pnpm install
3. Ensure PostgreSQL is running (via docker compose up -d or another local DB).
4. Start the Next.js server (server-only usage):
   - Using npm: npm run dev
   - Using bun: bun dev

Note: Specific scripts and migration steps (if any) are in package.json or other scripts. If you need help running migrations or seeds, check package.json or open an issue.

Testing

If this repo contains tests, run them via the provided test script in package.json (e.g., npm test). If there are no tests yet, consider adding unit and integration tests focused on transactional behavior and ledger accuracy.

Contributing

Contributions are welcome. Please open issues for bugs, feature requests, or proposals. For code changes, open a pull request with a clear description and test coverage for transactional or concurrency-sensitive changes.

License

If you have a LICENSE file in the repository, that determines the license. If not, add one (MIT is common for backend projects).

Contact

If you need help or want to collaborate, reach out via GitHub (https://github.com/xeureka) or open an issue in this repository.
