import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import StaffLogin from './components/staff/StaffLogin.jsx'; // new
import StaffDashboard from "./components/staff/StaffDashboard.jsx";
import ManageStaff from "./components/staff/ManageStaff.jsx";
import ReportsManagement from './components/staff/ReportsManagement';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/staff" element={<StaffLogin />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/manage" element={<ManageStaff />} />
        <Route path="/staff/reports" element={<ReportsManagement />} />
        {/* More routes will be added here soon */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
