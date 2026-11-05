const { toNumber } = require('./validators');

/**
 * Convert a PostgreSQL row into the object shape the React client expects.
 * `_id` is kept so the existing frontend continues to work unchanged.
 */

function mapUser(row, { includePassword = false } = {}) {
  if (!row) return null;

  const user = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    user.password = row.password;
  }

  return user;
}

function mapCustomer(row) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    user: row.user_id || null,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    createdAt: row.created_at,
  };
}

function mapProduct(row) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: toNumber(row.price),
    stock: toNumber(row.stock),
    category: row.category || 'General',
    createdAt: row.created_at,
  };
}

function mapOrderItem(item) {
  if (!item) return null;

  return {
    _id: item._id,
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    product: item.product
      ? {
          _id: item.product._id,
          name: item.product.name,
          price: toNumber(item.product.price),
          category: item.product.category,
        }
      : null,
  };
}

function mapOrder(row) {
  if (!row) return null;

  let items = row.items;

  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }

  return {
    _id: row.id,
    id: row.id,
    user: row.user_id
      ? {
          _id: row.user_id,
          name: row.user_name,
          email: row.user_email,
        }
      : null,
    customer: row.customer_id
      ? {
          _id: row.customer_id,
          name: row.customer_name,
          email: row.customer_email,
          phone: row.customer_phone,
        }
      : null,
    items: Array.isArray(items)
      ? items.map(mapOrderItem).filter(Boolean)
      : [],
    totalAmount: toNumber(row.total_amount),
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  mapUser,
  mapCustomer,
  mapProduct,
  mapOrder,
  mapOrderItem,
};
