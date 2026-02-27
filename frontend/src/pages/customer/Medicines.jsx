import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  Loader2,
  MessageSquare,
  Upload
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import { useCart } from '../../context/CartContext';
import SearchBar from '../../components/common/SearchBar';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

export default function Medicines() {
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addingToCart, setAddingToCart] = useState({});

  const limit = 20;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [page, category, search]);

  const loadCategories = async () => {
    try {
      const response = await customerService.getCategories();
      if (response.success) {
        setCategories([
          { id: 'All', name: 'All Medicines', icon: '🏥' },
          ...response.data.categories
        ]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        category: category !== 'All' ? category : undefined,
        search: search || undefined,
        in_stock: true
      };

      const response = search
        ? await customerService.searchMedicines(search, params)
        : await customerService.getMedicines(params);

      if (response.success) {
        setMedicines(response.data.medicines);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (medicine) => {
    setAddingToCart({ ...addingToCart, [medicine.id]: true });
    const result = await addToCart(medicine.id, 1);
    setAddingToCart({ ...addingToCart, [medicine.id]: false });
  };

  const getItemQuantity = (medicineId) => {
    const item = cart.items?.find(i => i.medicine_id === medicineId);
    return item?.quantity || 0;
  };

  const handleSearch = (query) => {
    setSearch(query);
    setPage(1);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  if (loading && medicines.length === 0) {
    return <Loading fullScreen text="Loading medicines..." />;
  }

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Medicines</h1>
          <p className="text-sm text-gray-500">
            Browse our catalog of verified medicines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customer/uploadPrescription')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition cursor-pointer"
          >
            <Upload size={18} />
            Upload Prescription
          </button>
          <button
            onClick={() => navigate('/customer/chat')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition cursor-pointer"
          >
            <MessageSquare size={18} />
            AI Chat
          </button>
          <button
            onClick={() => navigate('/customer/cart')}
            className="relative flex items-center gap-2 px-4 py-2 bg-white border rounded-xl font-medium hover:bg-gray-50 transition"
          >
            <ShoppingCart size={18} />
            Cart
            {cart.total_items > 0 && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {cart.total_items}
              </span>
            )}
          </button>
        </div>
      </div>

      <SearchBar
        placeholder="Search medicines by name, symptoms, or condition..."
        value={search}
        onChange={setSearch}
        onSearch={handleSearch}
      />

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="text-gray-400 flex-shrink-0" size={20} />
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              category === cat.id
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {cat.icon && <span>{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        Showing {medicines.length} medicines
        {search && ` for "${search}"`}
      </p>

      {loading ? (
        <Loading text="Loading medicines..." />
      ) : medicines.length === 0 ? (
        <EmptyState
          icon={<Search size={48} />}
          title="No medicines found"
          description={
            search
              ? `No results for "${search}". Try different keywords.`
              : 'No medicines available in this category.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {medicines.map((medicine, index) => {
              const qty = getItemQuantity(medicine.id);
              const isAdding = addingToCart[medicine.id];

              return (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl shadow-md border p-5 hover:shadow-xl transition cursor-pointer"
                  onClick={() => navigate(`/customer/medicines/${medicine.id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-4">
                    <div className="text-4xl">💊</div>
                  </div>

                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                    {medicine.category}
                  </span>

                  <h3 className="font-bold text-gray-800 mt-2 line-clamp-2">
                    {medicine.name}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    {medicine.generic_name}
                  </p>

                  <p className="text-xs text-gray-600 mt-1">
                    {medicine.brand}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-800">
                        ₹{medicine.price}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">/ unit</span>
                    </div>
                    {medicine.prescription_required && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                        Rx
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    {medicine.in_stock ? (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ In Stock ({medicine.stock} available)
                      </p>
                    ) : (
                      <p className="text-xs text-red-600 font-medium">
                        ✗ Out of Stock
                      </p>
                    )}
                  </div>

                  <div
                    className="mt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {qty === 0 ? (
                      <button
                        onClick={() => handleAddToCart(medicine)}
                        disabled={!medicine.in_stock || isAdding}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            Add to Cart
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Minus size={16} />
                        </button>
                        <span className="font-semibold text-blue-600">{qty}</span>
                        <button className="text-blue-600 hover:text-blue-700">
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}