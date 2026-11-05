// Shared SQL fragments used by the order and report controllers.

const ORDER_SELECT = `
  SELECT
    o.id,
    o.user_id,
    o.customer_id,
    o.total_amount,
    o.status,
    o.notes,
    o.created_at,
    o.updated_at,
    c.name  AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    u.name  AS user_name,
    u.email AS user_email,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            '_id', oi.id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', CASE
              WHEN p.id IS NULL THEN NULL
              ELSE json_build_object(
                '_id', p.id,
                'name', p.name,
                'price', p.price,
                'category', p.category
              )
            END
          )
          ORDER BY oi.created_at, oi.id
        )
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ),
      '[]'::json
    ) AS items
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.user_id
`;

/**
 * Build the visibility filter for orders. Admins see everything; normal users
 * only see their own orders.
 */
function buildOrderScope(req, { activeOnly = false } = {}) {
  const conditions = [];
  const params = [];

  if (req.user.role !== 'admin') {
    params.push(req.user._id);
    conditions.push(`o.user_id = $${params.length}`);
  }

  if (activeOnly) {
    conditions.push(`o.status <> 'cancelled'`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Add optional startDate/endDate boundaries (inclusive start, exclusive end).
 */
function addDateRange(scope, startDate, endDate) {
  const { params } = scope;
  let { where } = scope;

  if (startDate) {
    params.push(startDate);
    where += `${where ? ' AND' : 'WHERE'} o.created_at >= $${params.length}::date`;
  }

  if (endDate) {
    params.push(endDate);
    where += `${where ? ' AND' : 'WHERE'} o.created_at < ($${params.length}::date + INTERVAL '1 day')`;
  }

  return { where, params };
}

module.exports = {
  ORDER_SELECT,
  buildOrderScope,
  addDateRange,
};
