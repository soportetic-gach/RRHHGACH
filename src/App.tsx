import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import VacationsHR from './pages/VacationsHR';
import VacationsEmployee from './pages/VacationsEmployee';
import Catalogs from './pages/Catalogs';
import VacationBalances from './pages/VacationBalances';
import ExtraHoursControl from './pages/ExtraHoursControl';
import Birthdays from './pages/Birthdays';
import SiteEditor from './pages/SiteEditor';
import CampusDirectorsAdmin from './pages/CampusDirectorsAdmin';
import SiteAdmins from './pages/SiteAdmins';
import Reports from './pages/Reports';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

function MainRoutes() {
  const { user, role } = useAuth();

  const getInitialRoute = () => {
    if (role === 'ADMIN_TI') return '/dashboard';
    if (role === 'RRHH' || role === 'GERENCIA' || role === 'DIRECTOR_SEDE') return '/vacaciones';
    if (role === 'EMPLEADO') return '/mis-vacaciones';
    return '/dashboard'; // fallback
  };

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={getInitialRoute()} replace />} />

        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="empleados" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH']}>
            <Employees />
          </ProtectedRoute>
        } />

        <Route path="cumpleanos" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH']}>
            <Birthdays />
          </ProtectedRoute>
        } />

        <Route path="directores-sede" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH']}>
            <CampusDirectorsAdmin />
          </ProtectedRoute>
        } />

        <Route path="vacaciones" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH', 'GERENCIA', 'DIRECTOR_SEDE']}>
            <VacationsHR />
          </ProtectedRoute>
        } />

        <Route path="mis-vacaciones" element={
          <ProtectedRoute allowedRoles={['EMPLEADO', 'DIRECTOR_SEDE']}>
            <VacationsEmployee />
          </ProtectedRoute>
        } />

        <Route path="saldos" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH', 'DIRECTOR_SEDE', 'GERENCIA']}>
            <VacationBalances />
          </ProtectedRoute>
        } />

        <Route path="horas-extras" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH', 'DIRECTOR_SEDE', 'GERENCIA']}>
            <ExtraHoursControl />
          </ProtectedRoute>
        } />

        <Route path="catalogos" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI']}>
            <Catalogs />
          </ProtectedRoute>
        } />

        <Route path="editor-sitio" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI']}>
            <SiteEditor />
          </ProtectedRoute>
        } />

        <Route path="administradores" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI']}>
            <SiteAdmins />
          </ProtectedRoute>
        } />

        <Route path="reportes" element={
          <ProtectedRoute allowedRoles={['ADMIN_TI', 'RRHH']}>
            <Reports />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/unauthorized" element={<div style={{ padding: '2rem' }}>403 - No tienes permisos para ver esta página</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <MainRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
