import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../lib/supabase';

function Layout() {
  const { user, role, signOut } = useAuth();
  const { settings } = useSettings();
  const [employeeName, setEmployeeName] = useState('');
  const [employeePhoto, setEmployeePhoto] = useState('');

  useEffect(() => {
    if (user) {
      supabase
        .from('employees')
        .select('first_name, last_name, photo_url')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setEmployeeName(`${data.first_name} ${data.last_name}`);
            setEmployeePhoto(data.photo_url || '');
          }
        });
    }
  }, [user]);

  return (
    <div className="layout-container">
      <Sidebar role={role} onSignOut={signOut} employeeName={employeeName} employeePhoto={employeePhoto} />

      <div className="main-content">
        <header className="top-header">
          <div className="header-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2>{settings.company_name}</h2>
            {employeeName && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500, borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
                Bienvenido(a), {employeeName}
              </span>
            )}
          </div>
          <div className="header-user-info">
            <div className="user-details">
              <span className="user-email">{user?.email}</span>
              <span className={`badge badge-${role === 'ADMIN_TI' ? 'danger' : 'info'}`}>{role}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          background-color: var(--bg-color);
        }

        .top-header {
          height: var(--header-height);
          background-color: var(--surface-color);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-breadcrumbs h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .header-user-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .user-email {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .page-content {
          padding: 2rem;
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

export default Layout;
