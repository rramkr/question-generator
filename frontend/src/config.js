// API configuration
// In production (Vercel), use relative path since frontend and backend are on same domain
// In development, use localhost backend
const API_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');

export default API_URL;
