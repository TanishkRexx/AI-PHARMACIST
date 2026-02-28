import api from "./axios";

export const pharmacyService = {
  async getDashboard() {
    const response = await api.get("/pharmacy/dashboard");
    return response.data;
  },

  async getInventory(params = {}) {
    const response = await api.get("/pharmacy/inventory", { params });
    return response.data;
  },

  async getMedicineDetails(medicineId) {
    const response = await api.get(`/pharmacy/inventory/${medicineId}`);
    return response.data;
  },

  async addMedicine(medicineData) {
    const response = await api.post("/pharmacy/inventory", medicineData);
    return response.data;
  },

  async updateMedicine(medicineId, updateData) {
    const response = await api.put(
      `/pharmacy/inventory/${medicineId}`,
      updateData,
    );
    return response.data;
  },

  async updateStock(medicineId, quantity, operation = "add", reason = "") {
    const response = await api.post(`/pharmacy/inventory/${medicineId}/stock`, {
      quantity,
      operation,
      reason,
    });
    return response.data;
  },

  async getLowStockAlerts() {
    const response = await api.get("/pharmacy/inventory/alerts/low-stock");
    return response.data;
  },

  async getOrders(params = {}) {
    const response = await api.get("/pharmacy/orders", { params });
    return response.data;
  },

  async getOrderStats() {
    const response = await api.get("/pharmacy/orders/stats");
    return response.data;
  },

  async getOrderDetails(orderId) {
    const response = await api.get(`/pharmacy/orders/${orderId}`);
    return response.data;
  },

  async updateOrderStatus(orderId, status, notes = "") {
    const response = await api.put(`/pharmacy/orders/${orderId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  async getProcurementOrders(params = {}) {
    const response = await api.get("/pharmacy/procurement", { params });
    return response.data;
  },

  async createProcurementOrder(items, notes = "") {
    const response = await api.post("/pharmacy/procurement", {
      items,
      notes,
    });
    return response.data;
  },

  async getProcurementDetails(poId) {
    const response = await api.get(`/pharmacy/procurement/${poId}`);
    return response.data;
  },

  async receiveProcurement(poId) {
    const response = await api.post(`/pharmacy/procurement/${poId}/receive`);
    return response.data;
  },

  async getReorderSuggestions() {
    const response = await api.get("/pharmacy/procurement/suggestions/reorder");
    return response.data;
  },

  async getSalesAnalytics(days = 30) {
    const response = await api.get("/pharmacy/analytics/sales", {
      params: { days },
    });
    return response.data;
  },

  async getTopProducts(days = 30, limit = 10) {
    const response = await api.get("/pharmacy/analytics/top-products", {
      params: { days, limit },
    });
    return response.data;
  },

  async getDemandForecast() {
    const response = await api.get("/pharmacy/analytics/demand-forecast");
    return response.data;
  },

  async getInventoryHealth() {
    const response = await api.get("/pharmacy/analytics/inventory-health");
    return response.data;
  },

  async getAIForecast(daysHistory = 30, daysForecast = 30) {
    const response = await api.get("/pharmacy/analytics/ai-forecast", {
      params: { days_history: daysHistory, days_forecast: daysForecast },
    });
    return response.data;
  },

  async detectAnomalies(days = 30) {
    const response = await api.get("/pharmacy/analytics/anomalies", {
      params: { days },
    });
    return response.data;
  },

  async getInventoryOptimization() {
    const response = await api.get(
      "/pharmacy/analytics/inventory-optimization",
    );
    return response.data;
  },

  async updateProcurementStatus(poId, status, trackingInfo = {}) {
    const response = await api.put(`/pharmacy/procurement/${poId}/status`, {
      status,
      ...trackingInfo,
    });
    return response.data;
  },

  async getNotifications() {
    const response = await api.get("/pharmacy/notifications");
    return response.data;
  },

  async getSalesVelocity() {
    const response = await api.get("/pharmacy/analytics/sales-velocity");
    return response.data;
  },

  async getDeadStock() {
    const response = await api.get("/pharmacy/analytics/dead-stock");
    return response.data;
  },

  async getCategoryPerformance() {
    const response = await api.get("/pharmacy/analytics/category-performance");
    return response.data;
  },

  async getRevenueForecast(days = 30) {
    const response = await api.get("/pharmacy/analytics/revenue-forecast", {
      params: { days },
    });
    return response.data;
  },

  async getSmartReorder() {
    const response = await api.get("/pharmacy/analytics/smart-reorder");
    return response.data;
  },

  async getAISummary() {
    const response = await api.get("/pharmacy/analytics/ai-summary");
    return response.data;
  },
};
