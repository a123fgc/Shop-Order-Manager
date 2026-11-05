import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: { page, limit: 10, search },
      });
      setProducts(data.products || data.data || data);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', price: '', stock: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      description: product.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
    };
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category', render: (val) => val || '—' },
    {
      key: 'price',
      label: 'Price',
      render: (val) => (
        <span className="font-medium">${Number(val).toFixed(2)}</span>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${val <= 0
            ? 'bg-red-100 text-red-700'
            : val <= 10
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(row._id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {!isAdmin && (
            <span className="text-xs text-gray-400">
              View Only
            </span>
          )}
        </div>
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
            placeholder="Search products..."
            value={search}
            onChange={handleSearch}
            className="input-field pl-10"
          />
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable columns={columns} data={products} loading={loading} />

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

      {/* Modal */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
