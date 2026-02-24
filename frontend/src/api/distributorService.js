import api from './axios';

export const distributorService = {
  async getDashboard() {
    const response = await api.get('/distributor/dashboard');
    return response.data;
  },

  async getOrders(params = {}) {
    const response = await api.get('/distributor/orders', { params });
    return response.data;
  },

  async getOrderDetails(orderId) {
    const response = await api.get(`/distributor/orders/${orderId}`);
    return response.data;
  },

  async shipOrder(orderId, notes = '') {
    const response = await api.post(`/distributor/orders/${orderId}/ship`, {
      notes
    });
    return response.data;
  },

  async markDelivered(orderId) {
    const response = await api.post(`/distributor/orders/${orderId}/deliver`);
    return response.data;
  },

  // Analytics
  async getAnalytics(days = 30) {
    const response = await api.get('/distributor/analytics', {
      params: { days }
    });
    return response.data;
  }
};