import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // 确保 App 是从 src/App.tsx 导出的

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);