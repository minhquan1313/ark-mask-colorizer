import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import App from './App.jsx';
import './i18n/index.js';
import './styles.css';
import './styles/theme.css';
import 'antd/dist/reset.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#4A90E2',
          borderRadius: 8,
        },
        components: {
          Button: {
            controlHeight: 36,
          },
        },
      }}>
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
