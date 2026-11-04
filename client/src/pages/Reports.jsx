import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [salesRes, topProdRes, topCustRes, summaryRes] = await Promise.allSettled([
        api.get('/reports/sales', { params }),
        api.get('/reports/top-products', { params }),
        api.get('/reports/top-customers', { params }),
        api.get('/reports/dashboard'),
      ]);

      if (salesRes.status === 'fulfilled') {
        const val = salesRes.value.data;
        setSalesData(val.sales || val.salesData || val.data?.sales || val.data?.salesData || (Array.isArray(val.data) ? val.data : []));
      }
      if (topProdRes.status === 'fulfilled') {
        const val = topProdRes.value.data;
        setTopProducts(val.products || (Array.isArray(val.data) ? val.data : []));
      }
      if (topCustRes.status === 'fulfilled') {
        const val = topCustRes.value.data;
        setTopCustomers(val.customers || (Array.isArray(val.data) ? val.data : []));
      }
      if (summaryRes.status === 'fulfilled') {
        const val = summaryRes.value.data;
        setSummary(val.data || val || {});
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: `$${Number(summary.totalRevenue || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Total Orders',
      value: summary.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Avg Order Value',
      value: `$${(
        (summary.totalRevenue || 0) / Math.max(summary.totalOrders || 1, 1)
      ).toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Total Products',
      value: summary.totalProducts || 0,
      icon: Package,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary">
            Apply Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setTimeout(fetchReports, 0);
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div
            key={label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Over Time</h3>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              No sales data available
            </div>
          )}
        </div>

        {/* Top 5 Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Products</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [value, 'Quantity Sold']}
                />
                <Bar dataKey="totalSold" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              No product data available
            </div>
          )}
        </div>
      </div>

      {/* Top 5 Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Customers</h3>
        {topCustomers.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCustomers.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total Spent']}
              />
              <Bar dataKey="totalSpent" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400">
            No customer data available
          </div>
        )}
      </div>
    </div>
  );
}
