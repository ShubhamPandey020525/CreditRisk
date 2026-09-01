import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Lazy load pages for better performance/code-splitting
const Landing = lazy(() => import('./pages/Landing'));

function App() {
  return (
    <Router>
      <div className="app-container">
        <main className="main-content full-width">
          <Suspense fallback={<div className="flex-col items-center justify-center h-full w-full" style={{ display: 'flex', color: 'var(--text-muted)' }}>Loading interface...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Redirect old routes to the single page UI */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
