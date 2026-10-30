import axios from 'axios';

// Determine the base URL based on the environment
// IMPORTANT: Set VITE_API_BASE_URL in your frontend service environment variables on Zeabur
// to your backend service URL (e.g., https://psy-backend.zeabur.app)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; // 默認使用本地開發環境的URL

// If API_BASE_URL is empty after checking env var, log an error or throw,
// because relative paths won't work correctly with separate frontend/backend services.
console.info('API 配置信息:', {
  baseURL: API_BASE_URL,
  environment: import.meta.env.MODE,
  environmentVariables: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '(未設置)',
  },
});

/**
 * 格式化 API 錯誤
 *
 * @param {Error} error - Axios 錯誤對象
 * @param {string} defaultMessage - 預設錯誤訊息
 * @returns {Object} 標準化錯誤對象 { message, code, details }
 */
export const formatApiError = (error, defaultMessage = '發生錯誤，請稍後再試') => {
  // 檢查是否是 Axios 錯誤
  if (error.response) {
    // 伺服器回應了錯誤狀態碼
    const { data, status } = error.response;

    return {
      message: data?.message || data?.error || getStatusMessage(status) || defaultMessage,
      code: status,
      details: data || {},
    };
  } else if (error.request) {
    // 請求已發出但沒有收到回應，可能是網絡問題
    return {
      message: '無法連接到伺服器，請檢查您的網絡連接。',
      code: 'NETWORK_ERROR',
      details: { request: error.request },
    };
  } else {
    // 發生了其他錯誤
    return {
      message: error.message || defaultMessage,
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }
};

/**
 * 根據 HTTP 狀態碼返回適當的錯誤訊息
 */
const getStatusMessage = status => {
  const messages = {
    400: '請求參數有誤',
    401: '您需要登入或重新登入',
    403: '您沒有權限執行此操作',
    404: '請求的資源不存在',
    409: '操作衝突或已存在',
    422: '表單資料驗證失敗',
    429: '請求太頻繁，請稍後再試',
    500: '伺服器內部錯誤',
    502: '網關錯誤',
    503: '服務暫時不可用',
  };

  return messages[status] || null;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Use the backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 重要：啟用憑證 (Cookies) 跨域發送，用於 Session 認證
  timeout: 10000, // 增加超時設置，10秒
  // 嘗試解決CORS問題
  validateStatus: function (status) {
    return status >= 200 && status < 500; // 自訂驗證狀態
  },
});

// Add a request interceptor to include the token (if any)
// NOTE: Current backend does not use token authentication after login.
// This interceptor remains for potential future use but won't affect current backend.
apiClient.interceptors.request.use(
  config => {
    console.log(`API 請求: ${config.method?.toUpperCase()} ${config.url}`);
    // Token logic removed as backend uses httpOnly cookies for session management
    // const token = localStorage.getItem('token'); 
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`;
    // }
    return config;
  },
  error => {
    console.error('API 請求錯誤:', error);
    return Promise.reject(error);
  }
);

// 添加響應攔截器來標準化錯誤處理
apiClient.interceptors.response.use(
  response => {
    console.log(
      `API 回應: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`
    );
    // 對成功響應不做處理
    return response;
  },
  error => {
    // 檢查是否是網絡錯誤（無響應）
    if (!error.response) {
      console.error('API 網絡錯誤: 無法連接到伺服器', {
        url: error.config?.url || '未知URL',
        method: error.config?.method?.toUpperCase() || '未知方法',
      });
      // 增強錯誤訊息以提供更多調試信息
      error.message = '無法連接到伺服器 (' + API_BASE_URL + ')，請檢查後端服務是否運行中。';
    }

    // 格式化錯誤
    const formattedError = formatApiError(error);
    console.error('API 錯誤:', {
      url: error.config?.url || '未知URL',
      method: error.config?.method?.toUpperCase() || '未知方法',
      status: error.response?.status || '無狀態碼',
      message: formattedError.message,
      details: error.response?.data || error.message || '未提供詳細信息',
    });

    // 針對特定錯誤碼的處理
    if (formattedError.code === 401) {
      // 401 錯誤可能需要重定向到登入頁面
      console.warn('認證錯誤 (401): 現有登入無效或需重新登入。', formattedError.message);
      // 如果需要，可以觸發登出或重定向到登入頁面
      // window.location.href = '/login';
    }

    // 仍然拒絕承諾，但使用格式化後的錯誤
    return Promise.reject(Object.assign(error, { formatted: formattedError }));
  }
);

// --- Authentication --- //

// User Login (Matches POST /api/login)
// Backend expects { password }, frontend might send { username, password }
// The calling component might need adjustment if username is not needed by backend.
export const loginUser = credentials => {
  // Sending the full credentials object as backend requires both username and password
  return apiClient.post('/api/auth/login', credentials); // 修改為標準路徑
};

// ADDED: User Logout (Matches POST /api/logout)
export const logoutUser = () => {
  return apiClient.post('/api/auth/logout');
};

// ADDED: Get Current User Profile (Matches GET /api/me)
export const getCurrentUser = () => {
  return apiClient.get('/api/auth/me');
};

// ADDED: User Registration (Matches POST /api/register)
export const registerUser = registrationData => {
  // registrationData should contain { username, password, name, phone }
  return apiClient.post('/api/auth/register', registrationData); // 修改為標準路徑
};

// --- Settings --- //

// Get Settings (Matches GET /api/settings)
export const getSettings = () => {
  return apiClient.get('/api/settings');
};

// Update Settings (Matches PUT /api/settings)
export const updateSettings = settingsData => {
  return apiClient.put('/api/settings', settingsData);
};

// --- Schedule --- //

// Get Schedule for a specific month (Matches GET /api/schedule/:year/:month)
export const getScheduleForMonth = (year, month, doctorId = null) => {
  // 確保參數有效
  if (!year || !month) {
    console.error('getScheduleForMonth: 缺少必要參數', { year, month });
    return Promise.reject(new Error('排班查詢需要有效的年份和月份'));
  }

  // Ensure month is zero-padded if necessary
  const paddedMonth = String(month).padStart(2, '0');

  // 構建基本 URL - 注意這裡是 /api/schedules (複數)
  let url = `/api/schedules/${year}/${paddedMonth}`;

  // 如果提供了 doctorId，將其作為查詢參數添加
  if (doctorId) {
    url = `${url}?doctorId=${doctorId}`;
    console.log(`排班查詢 URL (帶醫生ID): ${url}`);
  } else {
    console.log(`排班查詢 URL (不帶醫生ID): ${url}`);
  }

  // 返回 promise
  return apiClient.get(url).catch(error => {
    console.error(`排班查詢失敗 (${year}-${paddedMonth}):`, error);
    throw error; // 重新拋出以便上層處理
  });
};

// Save schedule for a specific date (Matches POST /api/schedule)
// Backend expects { date, availableSlots: string[], isRestDay: boolean }
export const saveScheduleForDate = (date, availableSlots, isRestDay = false) => {
  // 驗證輸入
  if (!date || !Array.isArray(availableSlots)) {
    console.error('saveScheduleForDate: 無效輸入', { date, availableSlots, isRestDay });
    return Promise.reject(new Error('排班保存需要有效的日期和時段數組'));
  }

  console.log(`保存排班: ${date}, 時段數: ${availableSlots.length}, 是否休息日: ${isRestDay}`);
  return apiClient.post('/api/schedules', { date, availableSlots, isRestDay }).catch(error => {
    console.error(`保存排班失敗 (${date}):`, error);
    throw error;
  });
};

// Book an Appointment (Matches POST /api/book)
// Backend expects { date, time, patientName, patientPhone, patientEmail, ... }
export const bookAppointment = appointmentDetails => {
  return apiClient.post('/api/appointments', appointmentDetails);
};

// --- Appointments --- //

// UPDATED: Get My Appointments (Matches GET /api/appointments/my)
// This will automatically use the session to determine the user and role
export const getMyAppointments = () => {
  return apiClient.get('/api/appointments/my');
};

// Aliases for role-specific components that expect these functions
export const getPatientAppointments = getMyAppointments;
export const getDoctorAppointments = getMyAppointments;

// UPDATED: Get All Appointments (Doctor only) (Matches GET /api/appointments/all)
export const getAllAppointments = () => {
  return apiClient.get('/api/appointments/all');
};

// Cancel an Appointment (Matches PUT /api/appointments/:id/cancel)
// Backend endpoint doesn't differentiate roles for cancellation
export const cancelAppointment = appointmentId => {
  return apiClient.put(`/api/appointments/${appointmentId}/cancel`);
};
// Aliases for different roles
export const cancelPatientAppointment = cancelAppointment;
export const cancelAdminAppointment = cancelAppointment; // Assuming admin uses the same endpoint

// 獲取所有醫生列表 (用於預約頁面)
export const getDoctors = () => {
  return apiClient.get('/api/users/doctors');
};

// --- Removed Functions (Backend doesn't support these) --- //
// registerUser
// getUserProfile
// getAvailableSlots (replaced by getScheduleForMonth)
// addDoctorSlot (replaced by saveScheduleForDate)
// removeDoctorSlot
// bulkGenerateDoctorSlots
// loginAdmin

export default apiClient;
