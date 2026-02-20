import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Display from './pages/Display';
import Setup from './pages/Setup';
import { useTheme } from './hooks/useTheme';

function App() {
  // Apply theme CSS variables based on settings
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/" element={<Navigate to="/display" replace />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
