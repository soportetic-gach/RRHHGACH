import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    UserCog,
    Calendar,
    Settings,
    LogOut,
    Wallet,
    Gift,
    Palette,
    Building2,
    FileText
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SidebarProps {
    role: string | null;
    onSignOut: () => Promise<void>;
    employeeName?: string;
    employeePhoto?: string;
}

function Sidebar({ role, onSignOut, employeeName, employeePhoto }: SidebarProps) {
    const { settings } = useSettings();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="sidebar-logo" style={{ maxHeight: '32px', maxWidth: '32px', objectFit: 'contain' }} />
                ) : (
                    <Building2 className="sidebar-logo" size={32} />
                )}
                <span className="sidebar-title" style={{ fontSize: '1.1rem' }}>{settings.company_name}</span>
            </div>

            {employeeName && (
                <div className="sidebar-profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                    {employeePhoto ? (
                        <img src={employeePhoto} alt="Perfil" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem' }} />
                    ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>
                            {employeeName.charAt(0)}
                        </div>
                    )}
                    <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem', textAlign: 'center' }}>{employeeName}</span>
                </div>
            )}

            <nav className="sidebar-nav">
                {role === 'ADMIN_TI' && (
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                )}

                {['ADMIN_TI', 'RRHH'].includes(role || '') && (
                    <NavLink to="/empleados" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Empleados</span>
                    </NavLink>
                )}

                {['ADMIN_TI', 'RRHH'].includes(role || '') && (
                    <NavLink to="/cumpleanos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Gift size={20} />
                        <span>Cumpleaños</span>
                    </NavLink>
                )}

                {['ADMIN_TI', 'RRHH'].includes(role || '') && (
                    <NavLink to="/directores-sede" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <UserCog size={20} />
                        <span>Directores de Sede</span>
                    </NavLink>
                )}

                {['ADMIN_TI', 'RRHH', 'GERENCIA'].includes(role || '') && (
                    <NavLink to="/vacaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Calendar size={20} />
                        <span>Aprobaciones</span>
                    </NavLink>
                )}

                {['EMPLEADO', 'DIRECTOR_SEDE'].includes(role || '') && (
                    <>
                        <NavLink to="/mis-vacaciones" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Calendar size={20} />
                            <span>Mis Vacaciones</span>
                        </NavLink>
                    </>
                )}

                {['ADMIN_TI', 'RRHH'].includes(role || '') && (
                    <NavLink to="/saldos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Wallet size={20} />
                        <span>Saldos y Vacaciones</span>
                    </NavLink>
                )}

                {role === 'DIRECTOR_SEDE' && (
                    <NavLink to="/saldos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span>Reportes de Vacaciones</span>
                    </NavLink>
                )}

                {role === 'ADMIN_TI' && (
                    <NavLink to="/catalogos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Catálogos</span>
                    </NavLink>
                )}

                {role === 'ADMIN_TI' && (
                    <NavLink to="/editor-sitio" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Palette size={20} />
                        <span>Editor del Sitio</span>
                    </NavLink>
                )}
            </nav>

            <div className="sidebar-footer">
                <button onClick={onSignOut} className="btn-logout">
                    <LogOut size={20} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>

            <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--primary-gradient);
          color: white;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 15px rgba(0,0,0,0.1);
          z-index: 20;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-header {
          height: var(--header-height);
          display: flex;
          align-items: center;
          padding: 0 1.5rem;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(0, 0, 0, 0.1);
        }

        .sidebar-title {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          color: rgba(255, 255, 255, 0.8);
          border-radius: var(--radius-md);
          transition: all 0.2s;
          font-weight: 500;
        }

        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .nav-item.active {
          background-color: var(--secondary-color);
          color: white;
          border-left: 4px solid white;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background-color: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
      `}</style>
        </aside>
    );
}

export default Sidebar;
