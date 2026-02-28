import api from "./axios";

export const customerService = {
  // ============================================
  // EXISTING MEDICINE ENDPOINTS
  // ============================================
  async getMedicines(params = {}) {
    const response = await api.get("/customer/medicines", { params });
    return response.data;
  },

  async searchMedicines(query, options = {}) {
    const response = await api.get("/customer/medicines/search", {
      params: { q: query, ...options },
    });
    return response.data;
  },

  async getMedicineDetails(medicineId) {
    const response = await api.get(`/customer/medicines/${medicineId}`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get("/customer/categories");
    return response.data;
  },

  async getMedicinesByCategory(category, params = {}) {
    const response = await api.get(`/customer/medicines/category/${category}`, {
      params,
    });
    return response.data;
  },

  // ============================================
  // CHAT ENDPOINTS
  // ============================================
  async sendChatMessage(message, sessionId = null) {
    const response = await api.post("/customer/chat/message", {
      message,
      session_id: sessionId,
    });
    return response.data;
  },

  async sendVoiceMessage(audioBase64, sessionId = null, options = {}) {
    const {
      audioFormat = "webm",
      returnAudio = true,
      voiceType = "female_indian",
    } = options;

    const response = await api.post("/customer/chat/voice", {
      audio_base64: audioBase64,
      audio_format: audioFormat,
      session_id: sessionId,
      return_audio: returnAudio,
      voice_type: voiceType,
    });

    // Response now includes:
    // - message: Full detailed message (for display)
    // - voice_message: Short conversational message (for TTS)
    // - audio_base64: The TTS audio of voice_message
    return response.data;
  },

  async uploadVoiceMessage(audioFile, sessionId = null, options = {}) {
    const { returnAudio = true, voiceType = "female_indian" } = options;

    const formData = new FormData();
    formData.append("audio", audioFile);
    if (sessionId) formData.append("session_id", sessionId);
    formData.append("return_audio", returnAudio);
    formData.append("voice_type", voiceType);

    const response = await api.post("/customer/chat/voice/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async textToSpeech(text, voiceType = "female_indian") {
    const response = await api.post("/customer/chat/tts", {
      text,
      voice_type: voiceType,
    });
    return response.data;
  },

  async getVoiceStatus() {
    const response = await api.get("/customer/chat/voice/status");
    return response.data;
  },

  async getAvailableVoices() {
    const response = await api.get("/customer/chat/voice/voices");
    return response.data;
  },

  async getChatStatus() {
    const response = await api.get("/customer/chat/status");
    return response.data;
  },

  async uploadPrescription(file, sessionId = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) formData.append("session_id", sessionId);

    const response = await api.post("/customer/chat/prescription", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async clearChatSession(sessionId) {
    const response = await api.delete(`/customer/chat/session/${sessionId}`);
    return response.data;
  },

  // ============================================
  // CART ENDPOINTS
  // ============================================
  async getCart(includeAlternatives = false) {
    const response = await api.get("/customer/cart", {
      params: { include_alternatives: includeAlternatives },
    });
    return response.data;
  },

  async getCartSummary() {
    const response = await api.get("/customer/cart/summary");
    return response.data;
  },

  async addToCart(medicineId, quantity = 1) {
    const response = await api.post("/customer/cart/add", {
      medicine_id: medicineId,
      quantity,
    });
    return response.data;
  },

  async updateCartItem(medicineId, quantity) {
    const response = await api.put(`/customer/cart/update/${medicineId}`, {
      quantity,
    });
    return response.data;
  },

  async removeFromCart(medicineId) {
    const response = await api.delete(`/customer/cart/remove/${medicineId}`);
    return response.data;
  },

  async clearCart() {
    const response = await api.delete("/customer/cart/clear");
    return response.data;
  },

  // ============================================
  // PRICE OPTIMIZATION ENDPOINTS (NEW)
  // ============================================
  async optimizeCart(options = {}) {
    const response = await api.get("/customer/cart/optimize", {
      params: options,
    });
    return response.data;
  },

  async getSavingsSummary() {
    const response = await api.get("/customer/cart/savings-summary");
    return response.data;
  },

  async getMedicineAlternatives(medicineId, quantity = 1, maxAlternatives = 5) {
    const response = await api.get(
      `/customer/medicines/${medicineId}/alternatives`,
      {
        params: { quantity, max_alternatives: maxAlternatives },
      },
    );
    return response.data;
  },

  async getQuickAlternative(medicineId, quantity = 1) {
    const response = await api.get(
      `/customer/medicines/${medicineId}/quick-alternative`,
      {
        params: { quantity },
      },
    );
    return response.data;
  },

  async swapMedicine(originalId, alternativeId) {
    const response = await api.post("/customer/cart/swap", {
      original_medicine_id: originalId,
      alternative_medicine_id: alternativeId,
    });
    return response.data;
  },

  async undoSwap(medicineId) {
    const response = await api.post(`/customer/cart/undo-swap/${medicineId}`);
    return response.data;
  },

  async applyAllAlternatives(genericOnly = false) {
    const response = await api.post(
      `/customer/cart/apply-all-alternatives`,
      null,
      {
        params: { generic_only: genericOnly },
      },
    );
    return response.data;
  },

  async undoAllSwaps() {
    const response = await api.post("/customer/cart/undo-all-swaps");
    return response.data;
  },

  async compareMedicines(medicineId1, medicineId2) {
    const response = await api.post("/customer/medicines/compare", {
      medicine_id_1: medicineId1,
      medicine_id_2: medicineId2,
    });
    return response.data;
  },

  // ============================================
  // ORDER ENDPOINTS
  // ============================================
  async placeOrder(orderData) {
    const response = await api.post("/customer/orders", orderData);
    return response.data;
  },

  async mockPayment(orderId) {
    const response = await api.post(`/customer/orders/mock-payment/${orderId}`);
    return response.data;
  },

  async getOrders(page = 1, limit = 10) {
    const response = await api.get("/customer/orders", {
      params: { page, limit },
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

  // ============================================
  // RECOMMENDATIONS & HEALTH ENDPOINTS
  // ============================================
  async getRecommendations(limit = 5) {
    const response = await api.get("/customer/recommendations", {
      params: { limit },
    });
    return response.data;
  },

  async getRefillReminders() {
    const response = await api.get("/customer/refill-reminders");
    return response.data;
  },

  async getRefillSuggestions() {
    const response = await api.get("/customer/refill-suggestions");
    return response.data;
  },

  async getHealthProfile() {
    try {
      const response = await api.get("/customer/health/profile");
      return response.data;
    } catch (error) {
      console.error("Health profile error:", error);
      throw error;
    }
  },

  async getMedicationAdherence() {
    try {
      const response = await api.get("/customer/health/adherence");
      return response.data;
    } catch (error) {
      console.error("Adherence tracking error:", error);
      throw error;
    }
  },

  async getNotifications(includeRead = false, limit = 20) {
    const response = await api.get("/customer/notifications", {
      params: { include_read: includeRead, limit },
    });
    return response.data;
  },

  async getNotificationCount() {
    const response = await api.get("/customer/notifications/count");
    return response.data;
  },

  async markNotificationsRead(notificationIds) {
    const response = await api.post("/customer/notifications/mark-read", {
      notification_ids: notificationIds,
    });
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await api.post("/customer/notifications/mark-all-read");
    return response.data;
  },

  async dismissNotification(notificationId) {
    const response = await api.post("/customer/notifications/dismiss", {
      notification_id: notificationId,
    });
    return response.data;
  },

  async getNotificationPreferences() {
    const response = await api.get("/customer/notifications/preferences");
    return response.data;
  },

  async updateNotificationPreferences(preferences) {
    const response = await api.put(
      "/customer/notifications/preferences",
      preferences,
    );
    return response.data;
  },
};
