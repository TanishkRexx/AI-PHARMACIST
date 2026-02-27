import api from './axios';

export const adminService = {
  async getDashboard() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  async getUserDetails(userId) {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  async updateUserStatus(userId, isActive) {
    const response = await api.put(`/admin/users/${userId}/status`, {
      is_active: isActive
    });
    return response.data;
  },

  async getAllOrders(params = {}) {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  async getAllInventory(params = {}) {
    const response = await api.get('/admin/inventory', { params });
    return response.data;
  },

  async getAllProcurement(params = {}) {
    const response = await api.get('/admin/procurement', { params });
    return response.data;
  },

  async getSystemAnalytics(days = 30) {
    const response = await api.get('/admin/analytics/overview', {
      params: { days }
    });
    return response.data;
  },

  async getObservabilitySummary(hours = 24) {
    const response = await api.get('/admin/observability/summary', {
      params: { hours }
    });
    return response.data;
  },

  async getObservabilityStatus() {
    const response = await api.get('/admin/observability/status');
    return response.data;
  }
};