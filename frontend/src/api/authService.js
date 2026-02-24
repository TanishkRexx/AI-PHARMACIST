import api from './axios';

export const authService = {
  // Register new user
  async register(userData) {
    const roleMap = {
      'Patient': 'customer',
      'Pharmacist': 'pharmacy',
      'Distributor': 'distributor',
      'Admin': 'admin'
    };

    const payload = {
      email: userData.email,
      password: userData.password,
      name: userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : userData.name,
      phone: userData.phone,
      role: roleMap[userData.role] || userData.role.toLowerCase(),
      address: userData.address || null,
      medical_info: userData.role === 'Patient' ? {
        allergies: [],
        chronic_conditions: [],
        current_medications: []
      } : null
    };

    const response = await api.post('/auth/register', payload);
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Login user
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Get current user profile
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update profile
  async updateProfile(data) {
    const response = await api.put('/auth/profile', null, {
      params: data
    });
    return response.data;
  },

  // Update allergies
  async updateAllergies(allergies) {
    const response = await api.put('/auth/allergies', allergies);
    return response.data;
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check if logged in
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Get stored user
  getStoredUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};