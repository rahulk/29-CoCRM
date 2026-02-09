import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginScreen from './features/auth/pages/LoginScreen';
import ProfileScreen from './features/auth/pages/ProfileScreen';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Protected Routes (Placeholder for now) */}
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/dashboard" element={<div className="p-8"><h1 className="text-2xl font-bold">Dashboard Placeholder</h1><a href="/profile" className="text-primary underline">Go to Profile</a></div>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
