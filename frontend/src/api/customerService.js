import api from './axios';

export const customerService = {
  
  async getMedicines(params = {}) {
    const response = await api.get('/customer/medicines', { params });
    return response.data;
  },

  async searchMedicines(query, options = {}) {
    const response = await api.get('/customer/medicines/search', {
      params: { q: query, ...options }
    });
    return response.data;
  },

  async getMedicineDetails(medicineId) {
    const response = await api.get(`/customer/medicines/${medicineId}`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/customer/categories');
    return response.data;
  },

  async getMedicinesByCategory(category, params = {}) {
    const response = await api.get(`/customer/medicines/category/${category}`, { params });
    return response.data;
  },

  
  async sendChatMessage(message, sessionId = null) {
    const response = await api.post('/customer/chat/message', {
      message,
      session_id: sessionId
    });
    return response.data;
  },

  async uploadPrescription(file, sessionId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);
    
    const response = await api.post('/customer/chat/prescription', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async sendVoiceMessage(audioBase64, sessionId = null) {
    const response = await api.post('/customer/chat/voice', {
      audio_base64: audioBase64,
      session_id: sessionId
    });
    return response.data;
  },

  async clearChatSession(sessionId) {
    const response = await api.delete(`/customer/chat/session/${sessionId}`);
    return response.data;
  },

  
  async getCart() {
    const response = await api.get('/customer/cart');
    return response.data;
  },

  async addToCart(medicineId, quantity = 1) {
    const response = await api.post('/customer/cart/add', {
      medicine_id: medicineId,
      quantity
    });
    return response.data;
  },

  async updateCartItem(medicineId, quantity) {
    const response = await api.put(`/customer/cart/update/${medicineId}`, {
      quantity
    });
    return response.data;
  },

  async removeFromCart(medicineId) {
    const response = await api.delete(`/customer/cart/remove/${medicineId}`);
    return response.data;
  },

  async clearCart() {
    const response = await api.delete('/customer/cart/clear');
    return response.data;
  },

  
  async placeOrder(orderData) {
    const response = await api.post('/customer/orders', orderData);
    return response.data;
  },

  async mockPayment(orderId) {
    const response = await api.post(`/customer/orders/mock-payment/${orderId}`);
    return response.data;
  },

  async getOrders(page = 1, limit = 10) {
    const response = await api.get('/customer/orders', {
      params: { page, limit }
    });
    return response.data;
  },

  async getOrderDetails(orderId) {
    const response = await api.get(`/customer/orders/${orderId}`);
    return response.data;
  },

  async trackOrder(orderId) {
    const response = await api.get(`/customer/orders/${orderId}/track`);
    return response.data;
  },
  
  async getRecommendations(limit = 5) {
    const response = await api.get('/customer/recommendations', {
      params: { limit }
    });
    return response.data;
  },

  async getRefillReminders() {
    const response = await api.get('/customer/refill-reminders');
    return response.data;
  },

  async getRefillSuggestions() {
    const response = await api.get('/customer/refill-suggestions');
    return response.data;
  }
};