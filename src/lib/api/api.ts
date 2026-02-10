import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.relaysolutions.net/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api };
