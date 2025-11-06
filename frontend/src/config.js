// API configuration
// In production (Vercel), API is served from the same domain
// In development, use localhost backend
const API_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');

export default API_URL;
