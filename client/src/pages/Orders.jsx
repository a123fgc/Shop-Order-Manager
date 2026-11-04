import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/DataTable';
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'cancelled'];

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders || data.data || data);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      fetchOrders();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const columns = [
    {
      key: '_id',
      label: 'Order ID',
      render: (val) => (
        <span className="font-mono text-xs text-gray-600">#{val?.slice(-6).toUpperCase()}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (val) => val?.name || 'N/A',
    },
    {
      key: 'items',
      label: 'Items',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
          {val?.length || 0} items
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (val) => <span className="font-medium">${Number(val || 0).toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
            statusStyles[val] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => setSelectedOrder(row)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={handleSearch}
            className="input-field pl-10"
          />
        </div>
        <Link to="/orders/create" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors duration-200 ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable columns={columns} data={orders} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Order #{selectedOrder._id?.slice(-6).toUpperCase()}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer */}
              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="text-gray-900">{selectedOrder.customer?.name || 'N/A'}</p>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">Status</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusUpdate(selectedOrder._id, e.target.value)}
                    disabled={updatingStatus}
                    className="input-field w-auto"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {updatingStatus && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Items</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Price
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-gray-700">
                            {item.product?.name || item.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            ${Number(item.price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-500">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">
                  ${Number(selectedOrder.totalAmount || 0).toFixed(2)}
                </span>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-gray-700 text-sm mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-700 text-sm">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
