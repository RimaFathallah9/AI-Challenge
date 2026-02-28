import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarLayout } from './layouts/SidebarLayout';
import { ProtectedRoute } from './router/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataMonitoringPage } from './pages/DataMonitoringPage';
import { AlertsPage } from './pages/AlertsPage';
import { MachinePage } from './pages/MachinePage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { RLOptimizerPage } from './pages/RLOptimizerPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected — wrapped in dashboard layout */}
                <Route element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/monitoring" element={<DataMonitoringPage />} />
                    <Route path="/digital-twin" element={<DigitalTwinPage />} />
                    <Route path="/rl-optimizer" element={<RLOptimizerPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/machines" element={<MachinePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Catch-all → login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
