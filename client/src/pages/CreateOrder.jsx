
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';

export default function CreateOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product: '', quantity: 1 },
  ]);

  // Fetch products for everyone.
  // Fetch customers only for admins.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRequest = api.get('/products', {
          params: { limit: 1000 },
        });

        const requests = isAdmin
          ? [
            api.get('/customers', {
              params: { limit: 1000 },
            }),
            productRequest,
          ]
          : [productRequest];

        const responses = await Promise.all(requests);

        if (isAdmin) {
          const customerResponse = responses[0];
          const customerData =
            customerResponse.data.customers ||
            customerResponse.data.data ||
            customerResponse.data;

          setCustomers(
            Array.isArray(customerData) ? customerData : []
          );
        }

        const productResponse = isAdmin
          ? responses[1]
          : responses[0];

        const productData =
          productResponse.data.products ||
          productResponse.data.data ||
          productResponse.data;

        setProducts(
          Array.isArray(productData) ? productData : []
        );
      } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const addItem = () => {
    setItems([
      ...items,
      { product: '', quantity: 1 },
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;

    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = items.map((item, i) =>
      i === index
        ? { ...item, [field]: value }
        : item
    );

    setItems(updated);
  };

  const getProductPrice = (productId) => {
    const product = products.find(
      (p) => p._id === productId
    );

    return product ? Number(product.price) : 0;
  };

  const getLineTotal = (item) => {
    return (
      getProductPrice(item.product) *
      Number(item.quantity || 0)
    );
  };

  const grandTotal = items.reduce(
    (sum, item) => sum + getLineTotal(item),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only admin must select a customer.
    if (isAdmin && !customerId) {
      alert('Please select a customer');
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.product &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid product and quantity');
      return;
    }

    setSaving(true);

    try {
      const orderItems = validItems.map((item) => ({
        product: item.product,
        quantity: Number(item.quantity),
      }));

      // Normal users send only products and quantities.
      const orderData = {
        items: orderItems,
      };

      // Admin can additionally send customer and order details.
      if (isAdmin) {
        orderData.customer = customerId;
        orderData.status = status;
        orderData.notes = notes;
      }

      await api.post('/orders', orderData);

      alert('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      console.error('Create order error:', error);

      alert(
        error.response?.data?.message ||
        'Failed to create order'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Order
          </h2>

          <p className="text-sm text-gray-500">
            {isAdmin
              ? 'Create an order for any customer'
              : 'Select products and quantities to place your order'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Customer Selection - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Customer
            </h3>

            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select a customer...</option>

              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name} — {customer.email || customer.phone}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Order Items - Everyone */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Order Items
            </h3>

            <button
              type="button"
              onClick={addItem}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-end gap-3">

                {/* Product */}
                <div className="flex-1">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Product
                    </label>
                  )}

                  <select
                    value={item.product}
                    onChange={(e) =>
                      updateItem(index, 'product', e.target.value)
                    }
                    className="input-field"
                    required
                  >
                    <option value="">Select product...</option>

                    {products.map((p) => (
                      <option
                        key={p._id}
                        value={p._id}
                        disabled={Number(p.stock) <= 0}
                      >
                        {p.name} — ${Number(p.price).toFixed(2)}
                        {' '}(Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="w-24">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Qty
                    </label>
                  )}

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', e.target.value)
                    }
                    className="input-field"
                    required
                  />
                </div>

                {/* Subtotal */}
                <div className="w-28">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Subtotal
                    </label>
                  )}

                  <div className="h-[42px] flex items-center px-3 bg-gray-50 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">
                    ${getLineTotal(item).toFixed(2)}
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>
            ))}
          </div>

          {/* Grand Total */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Grand Total
              </p>

              <p className="text-2xl font-bold text-gray-900">
                ${grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Status & Notes - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Order Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Optional order notes..."
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">

          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}

            Create Order
          </button>

        </div>
      </form>
    </div>
  );
}
