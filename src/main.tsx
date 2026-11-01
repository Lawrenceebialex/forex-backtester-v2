import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// StrictMode removed temporarily — double-mounting effects made loops harder to isolate.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
