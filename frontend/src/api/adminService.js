import api from './axios';

export const adminService = {
  async getDashboard() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error;
    }
  },

  async getUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
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
    try {
      const response = await api.get('/admin/observability/summary', {
        params: { hours }
      });
      return response.data;
    } catch (error) {
      console.error('Observability summary error:', error);
      // Return fallback data instead of throwing
      return {
        success: true,
        data: {
          period_hours: hours,
          summary: {
            total_traces: 'N/A',
            total_llm_calls: 'N/A',
            avg_latency_ms: 'N/A',
            error_rate: 'N/A'
          },
          agent_breakdown: {},
          dashboard_url: null
        }
      };
    }
  },

   async getObservabilityStatus() {
    try {
      const response = await api.get('/admin/observability/status');
      return response.data;
    } catch (error) {
      console.error('Observability status error:', error);
      // Return fallback data
      return {
        success: true,
        data: {
          enabled: false,
          provider: null,
          dashboard_url: null,
          features: {
            trace_tracking: false,
            llm_monitoring: false,
            cost_tracking: false,
            latency_tracking: false,
            error_tracking: false
          }
        }
      };
    }
  }
};