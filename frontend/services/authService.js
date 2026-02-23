/**
 * Authentication Service
 * Handles: Login, Register, Logout, Get User
 */
import api, { getErrorMessage } from './api';

const authService = {
  // ==================== REGISTER ====================
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        role: userData.role || 'customer',
        address: userData.address || '',
      });
      
      const { access_token, user } = response.data;
      
      // Store token and user in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user, token: access_token };
    } catch (error) {
      return { 
        success: false, 
        error: getErrorMessage(error) 
      };
    }
  },

  // ==================== LOGIN ====================
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      const { access_token, user } = response.data;
      
      // Store token and user
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user, token: access_token };
    } catch (error) {
      return { 
        success: false, 
        error: getErrorMessage(error) 
      };
    }
  },

  // ==================== LOGOUT ====================
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    
    // Redirect to home
    window.location.href = '/';
  },

  // ==================== GET CURRENT USER ====================
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: getErrorMessage(error) 
      };
    }
  },

  // ==================== UPDATE PROFILE ====================
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: getErrorMessage(error) 
      };
    }
  },

  // ==================== HELPER METHODS ====================
  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getUserRole: () => {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user).role;
    }
    return null;
  },
};

export default authService;