import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/Toaster';
import AppRoutes from './routes';

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppProvider>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
              <AppRoutes />
              <Toaster />
            </ThemeProvider>
          </AppProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
