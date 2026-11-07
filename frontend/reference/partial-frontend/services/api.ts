import axios from 'axios';
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
export const api = axios.create({ baseURL, timeout: 10000 });
// Add bearer token handling after implementing secure JWT storage + backend auth.
