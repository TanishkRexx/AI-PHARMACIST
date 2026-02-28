import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Filter,
  Package,
  AlertTriangle,
  RefreshCw,
  Edit,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import { useDebounce } from '../../hooks/useDebounce';
import SearchBar from '../../components/common/SearchBar';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import StockUpdateModal from '../../components/pharmacy/StockUpdateModal';
import toast from 'react-hot-toast';

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [stockFilter, setStockFilter] = useState(searchParams.get('stock_status') || 'all');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Stats from backend
  const [stats, setStats] = useState({ 
    total: 0,
    critical: 0, 
    low: 0, 
    sufficient: 0 
  });

  // Stock Update Modal
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    medicine: null,
    operation: 'add'
  });

  const limit = 20;

  useEffect(() => {
    loadInventory();
  }, [page, stockFilter, category, debouncedSearch]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getInventory({
        page,
        limit,
        stock_status: stockFilter !== 'all' ? stockFilter : undefined,
        category: category || undefined,
        search: debouncedSearch || undefined
      });

      if (response.success) {
        setMedicines(response.data.medicines);
        setTotalPages(response.data.pagination.pages);
        setTotal(response.data.pagination.total);

        if (response.data.stats) {
          setStats({
            total: response.data.stats.total || 0,
            critical: response.data.stats.critical || 0,
            low: response.data.stats.low || 0,
            sufficient: response.data.stats.sufficient || 0
          });
        }
      }
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = (medicine, operation) => {
    setStockModal({
      isOpen: true,
      medicine,
      operation
    });
  };

  const closeStockModal = () => {
    setStockModal({
      isOpen: false,
      medicine: null,
      operation: 'add'
    });
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-600 border-red-200';
      case 'low_stock': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-green-100 text-green-600 border-green-200';
    }
  };

  const getStockStatusLabel = (status) => {
    switch (status) {
      case 'out_of_stock': return 'Out of Stock';
      case 'low_stock': return 'Low Stock';
      default: return 'In Stock';
    }
  };

  const filters = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'low', label: 'Low Stock', count: stats.low, color: 'text-yellow-600' },
    { key: 'out', label: 'Out of Stock', count: stats.critical, color: 'text-red-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-sm text-gray-500">
            Manage your medicine stock and reorder levels
          </p>
        </div>
        <button
          onClick={() => navigate('/pharmacy/inventory/add')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
        >
          <Plus size={18} />
          Add Medicine
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200"
        >
          <p className="text-sm text-blue-600">Total</p>
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200 cursor-pointer"
          onClick={() => { setStockFilter('out'); setPage(1); }}
        >
          <p className="text-sm text-red-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200 cursor-pointer"
          onClick={() => { setStockFilter('low'); setPage(1); }}
        >
          <p className="text-sm text-yellow-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.low}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 cursor-pointer"
          onClick={() => { setStockFilter('ok'); setPage(1); }}
        >
          <p className="text-sm text-green-600">Sufficient</p>
          <p className="text-2xl font-bold text-green-700">{stats.sufficient}</p>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Search medicines..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                setStockFilter(filter.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                stockFilter === filter.key
                  ? 'bg-purple-600 text-white'
                  : `bg-white text-gray-600 border hover:bg-gray-50 ${filter.color || ''}`
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Results Count */}
      {(debouncedSearch || stockFilter !== 'all') && (
        <div className="text-sm text-gray-500">
          Showing {medicines.length} of {total} results
          {debouncedSearch && <span className="ml-1">for "{debouncedSearch}"</span>}
        </div>
      )}

      {/* Inventory Table */}
      {loading ? (
        <Loading text="Loading inventory..." />
      ) : medicines.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="No medicines found"
          description={debouncedSearch ? `No results for "${debouncedSearch}"` : "Add medicines to your inventory"}
          action={() => navigate('/pharmacy/inventory/add')}
          actionLabel="Add Medicine"
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Medicine</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Stock Health</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Price</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine, index) => {
                const stockPercent = Math.min(
                  Math.round((medicine.stock_quantity / medicine.reorder_level) * 50),
                  100
                );
                
                return (
                  <motion.tr
                    key={medicine.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{medicine.name}</p>
                        <p className="text-xs text-gray-500">{medicine.generic_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                        {medicine.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{stockPercent}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              medicine.stock_status === 'out_of_stock' ? 'bg-red-500' :
                              medicine.stock_status === 'low_stock' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{medicine.stock_quantity}</span>
                        <span className="text-gray-500 text-sm">/ {medicine.reorder_level}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">₹{medicine.unit_price}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStockStatusColor(medicine.stock_status)}`}>
                        {getStockStatusLabel(medicine.stock_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {/* Add Stock Button */}
                        <button
                          onClick={() => openStockModal(medicine, 'add')}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                          title="Add Stock"
                        >
                          <Plus size={16} />
                        </button>
                        
                        {/* Remove Stock Button */}
                        <button
                          onClick={() => openStockModal(medicine, 'subtract')}
                          disabled={medicine.stock_quantity === 0}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove Stock"
                        >
                          <Minus size={16} />
                        </button>
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/pharmacy/inventory/edit/${medicine.id}`)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                          title="Edit Medicine"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {/* Reorder Button */}
                        <button
                          onClick={() => navigate('/pharmacy/procurement', {
                            state: { preselected: [{ medicine_id: medicine.id, quantity: medicine.reorder_level * 2 }] }
                          })}
                          className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
                          title="Reorder"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={stockModal.isOpen}
        onClose={closeStockModal}
        medicine={stockModal.medicine}
        defaultOperation={stockModal.operation}
        onUpdate={loadInventory}
      />
    </div>
  );
}