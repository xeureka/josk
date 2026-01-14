SELECT
  c.id,
  c.name,
  SUM(l.amount) AS outstanding_balance,
  MIN(l.created_at) AS oldest_unpaid
FROM customers c
JOIN credit_ledger l
  ON c.id = l.customer_id
WHERE
  l.paid_at IS NULL
GROUP BY c.id, c.name
HAVING
  MIN(l.created_at) < NOW() - INTERVAL '30 days';
