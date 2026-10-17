import axios from 'axios';

// Use relative '/' so Vercel proxy forwards /api/* to the backend (avoids CORS)
const BASE_URL = '/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Domain': 'nilesh',
  },
});

// Request Interceptor: add auth token & tenant header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ensure X-Domain is set to nilesh (or stored override)
  const tenantDomain = localStorage.getItem('tenant_domain') || 'nilesh';
  config.headers['X-Domain'] = tenantDomain;

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: handle 401 token refresh if needed
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken }, {
            headers: { 'X-Domain': localStorage.getItem('tenant_domain') || 'nilesh' }
          });
          if (res.data?.access_token) {
            localStorage.setItem('access_token', res.data.access_token);
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('is_logged_in');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/* ==========================================================================
   REQUEST DEDUPLICATION (prevents duplicate simultaneous network requests)
   ========================================================================== */
const inFlightRequests = new Map();

export const dedupeGet = async (url, config) => {
  const key = config && Object.keys(config).length > 0 ? `${url}_${JSON.stringify(config)}` : url;
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = api.get(url, config)
    .then(res => res.data)
    .finally(() => {
      inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, promise);
  return promise;
};

/* ==========================================================================
   AUTHENTICATION & PROFILE APIs
   ========================================================================== */
export const loginApi = async ({ login, password, remember = 0 }) => {
  const payload = {
    login,
    password,
    remember: remember ? 1 : 0,
  };
  const response = await api.post('api/v1/auth/login', payload);
  return response.data;
};

export const verifyCampusApi = async (campusCode) => {
  const response = await api.post('api/v1/auth/verify-campus', { campusCode });
  return response.data;
};

export const checkParentExistApi = async (emailId) => {
  const response = await api.post('api/v1/auth/check-parent-exist', { emailId });
  return response.data;
};

export const getGradesApi = async (campusId) => {
  const response = await api.get(`api/v1/auth/grades?campusId=${campusId}`);
  return response.data;
};

export const getClassroomsApi = async (gradeId, campusId) => {
  const response = await api.get(`api/v1/auth/classrooms?gradeId=${gradeId}&campusId=${campusId}`);
  return response.data;
};

export const registerApi = async (data) => {
  const response = await api.post('api/v1/auth/register', data);
  return response.data;
};

export const getProfileApi = async () => {
  return dedupeGet('api/v1/profile');
};

export const updateProfileApi = async (data) => {
  const response = await api.put('api/v1/profile', data);
  return response.data;
};

export const changePasswordApi = async (data) => {
  const response = await api.post('api/v1/profile/change-password', data);
  return response.data;
};

/* ==========================================================================
   CHILDREN MANAGEMENT APIs
   ========================================================================== */
export const getChildrenApi = async () => {
  const response = await api.get('api/v1/children');
  return response.data;
};

export const addChildApi = async (data) => {
  const response = await api.post('api/v1/children', data);
  return response.data;
};

export const updateChildApi = async (childId, data) => {
  const response = await api.put(`api/v1/children/${childId}`, data);
  return response.data;
};

export const deleteChildApi = async (childId) => {
  const response = await api.delete(`api/v1/children/${childId}`);
  return response.data;
};

/* ==========================================================================
   ORDERS & CART APIs
   ========================================================================== */
export const getOrdersApi = async (params) => {
  return dedupeGet('api/v1/orders', params ? { params } : undefined);
};

export const getOrderDetailsApi = async (orderId) => {
  const response = await api.get(`api/v1/orders/${orderId}`);
  return response.data;
};

export const cancelOrderApi = async (orderId) => {
  const response = await api.post(`api/v1/orders/${orderId}/cancel`);
  return response.data;
};

export const getCartApi = async () => {
  return dedupeGet('api/v1/orders/cart');
};

export const deleteCartItemApi = async (orderId) => {
  const cleanId = typeof orderId === 'object' && orderId !== null ? (orderId.orderId || orderId.id) : orderId;
  const response = await api.delete(`api/v1/orders/cart/${cleanId}`);
  return response.data;
};

export const calculateTotalApi = async (data) => {
  const response = await api.post('api/v1/orders/calculate-total', data);
  return response.data;
};

export const validateOrdersApi = async (data) => {
  const response = await api.post('api/v1/orders/validate', data);
  return response.data;
};

export const createOrderApi = async (data) => {
  const payload = { ...data };
  if (!payload.typeId && payload.childId) {
    payload.typeId = parseInt(payload.childId, 10);
  }
  if (payload.type === undefined || payload.type === null) {
    payload.type = 5;
  }
  const response = await api.post('api/v1/orders', payload);
  return response.data;
};

/* ==========================================================================
   CREDITS & WALLET APIs
   ========================================================================== */
export const getCreditBalanceApi = async () => {
  const response = await api.get('api/v1/credits/balance');
  return response.data;
};

export const getCreditHistoryApi = async () => {
  const response = await api.get('api/v1/credits/history');
  return response.data;
};

export const topupCreditApi = async (data) => {
  const response = await api.post('api/v1/credits/topup', data);
  return response.data;
};

/* ==========================================================================
   DASHBOARD APIs
   ========================================================================== */
export const getDashboardSummaryApi = async () => {
  return dedupeGet('api/v1/dashboard/summary');
};

/* ==========================================================================
   MENUS APIs (Cached in-memory to prevent repeated redundant network requests)
   ========================================================================== */
const menusCache = new Map();

export const clearMenusCache = () => {
  menusCache.clear();
};

export const getMenusApi = async (forceRefresh = false) => {
  const cacheKey = 'menus_all';
  if (!forceRefresh && menusCache.has(cacheKey)) {
    return menusCache.get(cacheKey);
  }
  const data = await dedupeGet('api/v1/menus');
  menusCache.set(cacheKey, data);
  return data;
};

export const getMenusForChildApi = async (childId, forceRefresh = false) => {
  const cacheKey = `menus_child_${childId}`;
  if (!forceRefresh && menusCache.has(cacheKey)) {
    return menusCache.get(cacheKey);
  }
  const data = await dedupeGet(`api/v1/menus?childId=${childId}`);
  menusCache.set(cacheKey, data);
  return data;
};

export const getMenuDetailApi = async (menuId, childId, forceRefresh = false) => {
  const cacheKey = `menu_detail_${menuId}_${childId}`;
  if (!forceRefresh && menusCache.has(cacheKey)) {
    return menusCache.get(cacheKey);
  }
  const data = await dedupeGet(`api/v1/menus/${menuId}?childId=${childId}`);
  menusCache.set(cacheKey, data);
  return data;
};

export const getOrderedDatesApi = async (childId, menuId) => {
  return dedupeGet(`api/v1/orders/date-history?childId=${childId}&menuId=${menuId}`);
};

/* ==========================================================================
   CHECKOUT APIs
   ========================================================================== */
export const checkoutApi = async (data) => {
  const response = await api.post('api/v1/orders/checkout', data);
  return response.data;
};

/* ==========================================================================
   LUNCH CARD APIs
   ========================================================================== */
export const getLunchCardApi = async (intervalTypeOrParams = 1, twoColumns = true) => {
  if (typeof intervalTypeOrParams === 'object' && intervalTypeOrParams !== null) {
    const response = await api.get('api/v1/reports/lunch-card', { params: intervalTypeOrParams });
    return response.data;
  }
  const response = await api.get(`api/v1/reports/lunch-card?intervalType=${intervalTypeOrParams}&twoColumns=${twoColumns}`);
  return response.data;
};

/* ==========================================================================
   SUPPORT APIs
   ========================================================================== */
export const submitSupportRequestApi = async (data) => {
  const response = await api.post('api/v1/support/request', data);
  return response.data;
};

export default api;
