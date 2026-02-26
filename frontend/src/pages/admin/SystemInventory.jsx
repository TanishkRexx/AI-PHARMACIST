import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Filter,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

export default function SystemInventory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stockFilter, setStockFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const limit = 30;

  useEffect(() => {
    loadInventory();
  }, [page, stockFilter, categoryFilter]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllInventory({
        page,
        limit,
        stock_status: stockFilter || undefined,
        category: categoryFilter || undefined
      });

      if (response.success) {
        setMedicines(response.data.medicines);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const stockFilters = [
    { value: '', label: 'All Stock' },
    { value: 'low', label: 'Low Stock' },
    { value: 'out', label: 'Out of Stock' }
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'painkiller', label: 'Painkillers' },
    { value: 'antibiotic', label: 'Antibiotics' },
    { value: 'antidiabetic', label: 'Antidiabetic' },
    { value: 'cardiovascular', label: 'Cardiovascular' },
    { value: 'vitamin', label: 'Vitamins' }
  ];

  const getStockStatus = (status) => {
    switch (status) {
      case 'out_of_stock':
        return { label: 'Out of Stock', color: 'bg-red-500/20 text-red-400' };
      case 'low_stock':
        return { label: 'Low Stock', color: 'bg-yellow-500/20 text-yellow-400' };
      default:
        return { label: 'In Stock', color: 'bg-green-500/20 text-green-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Inventory</h1>
        <p className="text-gray-400">View all medicines across the platform</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
          <CheckCircle className="text-green-400 mb-2" size={24} />
          <p className="text-2xl font-bold text-white">
            {medicines.filter(m => m.stock_status === 'in_stock').length}
          </p>
          <p className="text-sm text-gray-400">In Stock</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
          <AlertTriangle className="text-yellow-400 mb-2" size={24} />
          <p className="text-2xl font-bold text-white">
            {medicines.filter(m => m.stock_status === 'low_stock').length}
          </p>
          <p className="text-sm text-gray-400">Low Stock</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
          <Package className="text-red-400 mb-2" size={24} />
          <p className="text-2xl font-bold text-white">
            {medicines.filter(m => m.stock_status === 'out_of_stock').length}
          </p>
          <p className="text-sm text-gray-400">Out of Stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter size={20} className="text-gray-400" />
        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
        >
          {stockFilters.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
        >
          {categoryOptions.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <Loading text="Loading inventory..." />
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Medicine</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Price</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Stock</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Rx</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med, index) => {
                const stockStatus = getStockStatus(med.stock_status);

                return (
                  <motion.tr
                    key={med.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-t border-gray-700 hover:bg-gray-700/30"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{med.name}</p>
                        <p className="text-xs text-gray-400">{med.generic_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                        {med.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">₹{med.unit_price}</td>
                    <td className="px-6 py-4">
                      <span className="text-white">{med.stock_quantity}</span>
                      <span className="text-gray-500 text-sm"> / {med.reorder_level}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {med.prescription_required && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          Required
                        </span>
                      )}
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
    </div>
  );
}