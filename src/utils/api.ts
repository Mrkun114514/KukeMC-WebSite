import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://api.kuke.ink',
  timeout: 60000,
});

export default api;
