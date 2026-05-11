import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// ── Global Axios Defaults ─────────────────────────────────────────────────────
// withCredentials: true → sends the session cookie on every cross-origin request
// (required for Render backend ↔ caphebistro.in frontend communication)
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
