import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import SearchBar from '../../components/common/SearchBar';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingUser, setUpdatingUser] = useState(null);

  const limit = 15;

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        page,
        limit,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: search || undefined
      });

      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    setUpdatingUser(userId);
    try {
      const response = await adminService.updateUserStatus(userId, !currentStatus);
      if (response.success) {
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setUpdatingUser(null);
    }
  };

  const filters = [
    { key: 'all', label: 'All Users' },
    { key: 'customer', label: 'Customers' },
    { key: 'pharmacy', label: 'Pharmacies' },
    { key: 'distributor', label: 'Distributors' }
  ];

  const roleColors = {
    customer: 'bg-blue-500/20 text-blue-400',
    pharmacy: 'bg-purple-500/20 text-purple-400',
    distributor: 'bg-green-500/20 text-green-400',
    admin: 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-gray-400">Manage all platform users</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                setRoleFilter(filter.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                roleFilter === filter.key
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <Loading text="Loading users..." />
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Phone</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Joined</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-t border-gray-700 hover:bg-gray-700/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{user.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                        className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          disabled={updatingUser === user.id}
                          className={`p-2 rounded-lg transition ${
                            user.is_active
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {updatingUser === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.is_active ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
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