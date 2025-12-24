import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Suppress expected errors globally
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args) => {
    const message = args.join(' ').toLowerCase();
    const firstArg = args[0];
    
    // Suppress workspace/current 400/404 errors
    if (
      message.includes('workspace/current') &&
      (message.includes('400') || message.includes('404') || message.includes('bad request'))
    ) {
      return;
    }
    
    // Suppress /auth/profile 401 errors (expected when not logged in)
    if (
      (message.includes('/auth/profile') || message.includes('auth/profile')) &&
      (message.includes('401') || message.includes('unauthorized'))
    ) {
      return;
    }
    
    // Suppress network-level "Failed to load resource" for expected auth errors
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('Failed to load resource') &&
      (message.includes('/auth/profile') || message.includes('auth/profile')) &&
      (message.includes('401') || message.includes('unauthorized'))
    ) {
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ').toLowerCase();
    
    // Suppress workspace/current 400/404 warnings
    if (
      message.includes('workspace/current') &&
      (message.includes('400') || message.includes('404') || message.includes('bad request'))
    ) {
      return;
    }
    
    // Suppress /auth/profile 401 warnings
    if (
      (message.includes('/auth/profile') || message.includes('auth/profile')) &&
      (message.includes('401') || message.includes('unauthorized'))
    ) {
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)