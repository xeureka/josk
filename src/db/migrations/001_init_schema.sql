CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- businesses (tenants)
CREATE TABLE businesses(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
)

-- Customers (credit holders)
CREATE TABLE customers(
  id UUID PRIMARy KEY NOT NULL DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  credit_limit NUMERIC NOT NULL CHECK (credit_limit >= 0),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id,id)
)

-- products(stock controlled)
CREATE TABLE products(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id,id)
)

-- Orders (immutable facts)
CREATE TABLE orders(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  total_amount NUMERIC NOT NULL CHECK(total_amount >= 0),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Order Items
CREATE TABLE order_items(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC NOT NULL CHECK  (price_at_purchase >= 0)
)

-- credit ledger 
CREATE TABLE credit_ledger(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id  UUID REFERENCES orders(id),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
)

-- postive amount = credit used
-- negative amount = payment
-- unpaid credit = paid_at is NULL
