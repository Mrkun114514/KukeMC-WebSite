import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://api.kuke.ink',
  timeout: 60000,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Security Utils ---
// In a real world, keeping secret in frontend is not secure.
// But per user request for "website encryption algorithm", we implement it here.
// Ideally, we should fetch a signed upload URL from backend.
// But for this task, we follow the instruction to calculate on frontend.

const UPLOAD_SECRET = "kuke_upload_secret_2024"; 

export const generateUploadHeaders = async () => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}${UPLOAD_SECRET}`;
  
  // Calculate SHA-256
  const msgBuffer = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    'X-Upload-Signature': signature,
    'X-Upload-Timestamp': timestamp
  };
};

export default api;
