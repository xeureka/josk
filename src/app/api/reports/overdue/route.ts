import { NextResponse } from "next/server";
import { pool } from "@/lib/db"

export async function GET(req:Request){
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId){
        return NextResponse.json(
            {error: 'businessId is required'},
            {status: 400}
        );
    }

    const result = await pool.query(
            `
    SELECT
      c.id AS customer_id,
      c.business_id,
      SUM(l.amount) AS outstanding_balance,
      MIN(l.created_at) AS oldest_unpaid_at
    FROM credit_ledger l
    JOIN customers c ON c.id = l.customer_id
    WHERE c.business_id = $1
      AND l.amount > 0
      AND l.created_at < NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.business_id
    HAVING SUM(l.amount) > 0
    ORDER BY oldest_unpaid_at ASC
    `,
    [businessId]
    )

    return NextResponse.json({
        count: result.rowCount,
        customers: result.rows,
    })
}

// Testing script
// curl "http://localhost:3000/api/reports/overdue?businessId=b1"
