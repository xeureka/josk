import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/transaction";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    businessId,
    customerId,
    items, // [{ productId, quantity }]
  } = body;

  const result = await withTransaction(async (client) => {
    // Get customer credit information with lock
    const customerRes = await client.query(
      `
        SELECT credit_limit,
               COALESCE(SUM(amount), 0) AS balance
        FROM customers c
        LEFT JOIN credit_ledger l
            ON c.id = l.customer_id
        WHERE c.id = $1 AND c.business_id = $2
        GROUP BY credit_limit
        FOR UPDATE
      `,
      [customerId, businessId]
    );

    if (customerRes.rowCount === 0) {
      throw new Error("Customer not found");
    }

    const { credit_limit, balance } = customerRes.rows[0];

    let total = 0;

    // Lock products and validate stock
    for (const item of items) {
      const productRes = await client.query(
        `
          SELECT stock, price
          FROM products
          WHERE id = $1 AND business_id = $2
          FOR UPDATE
        `,
        [item.productId, businessId]
      );

      if (productRes.rowCount === 0) {
        throw new Error("Product not found");
      }

      const { stock, price } = productRes.rows[0];

      if (stock < item.quantity) {
        throw new Error("Insufficient stock");
      }

      total += price * item.quantity;
    }

    // Validate credit
    if (balance + total > credit_limit) {
      throw new Error("Credit limit exceeded");
    }

    // Create order
    const orderRes = await client.query(
      `
        INSERT INTO orders (business_id, customer_id, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [businessId, customerId, total]
    );

    const orderId = orderRes.rows[0].id;

    // Update stock and create order items
    for (const item of items) {
      const { rows } = await client.query(
        `
          UPDATE products
          SET stock = stock - $1
          WHERE id = $2
          RETURNING price
        `,
        [item.quantity, item.productId]
      );

      await client.query(
        `
          INSERT INTO order_items
          (order_id, product_id, quantity, price_at_purchase)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.productId, item.quantity, rows[0].price]
      );
    }

    // Record credit usage
    await client.query(
      `
        INSERT INTO credit_ledger
        (business_id, customer_id, order_id, amount)
        VALUES ($1, $2, $3, $4)
      `,
      [businessId, customerId, orderId, total]
    );

    return { orderId };
  });

  return NextResponse.json(result);
}
