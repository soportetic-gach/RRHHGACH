import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  UserMinus,
  Clock,
  CheckCircle,
  XCircle,
  BarChart4
} from 'lucide-react';

interface Stats {
  activeEmployees: number;
  inactiveEmployees: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    activeEmployees: 0,
    inactiveEmployees: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });

  // Dynamic chart data
  const [deptStats, setDeptStats] = useState<{ name: string, count: number, percentage: number }[]>([]);
  const [campusStats, setCampusStats] = useState<{ name: string, count: number, percentage: number }[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Parallel queries for fast loading
      const [
        { count: activeCount },
        { count: inactiveCount },
        { count: pendingCount },
        { count: approvedCount },
        { count: rejectedCount },
        { data: allEmployees }
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employee_status', 'ACTIVO'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employee_status', 'INACTIVO'),
        supabase.from('vacation_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDIENTE'),
        supabase.from('vacation_requests').select('*', { count: 'exact', head: true }).eq('status', 'APROBADO'),
        supabase.from('vacation_requests').select('*', { count: 'exact', head: true }).eq('status', 'RECHAZADO'),
        supabase.from('employees').select(`
                    id, 
                    departments(name), 
                    campuses(name)
                `).eq('employee_status', 'ACTIVO')
      ]);

      setStats({
        activeEmployees: activeCount || 0,
        inactiveEmployees: inactiveCount || 0,
        pendingRequests: pendingCount || 0,
        approvedRequests: approvedCount || 0,
        rejectedRequests: rejectedCount || 0
      });

      // Process dynamic charts
      const totalActive = activeCount || 1; // prevent div by zero
      if (allEmployees) {
        const deptsMap: Record<string, number> = {};
        const campusMap: Record<string, number> = {};

        allEmployees.forEach((emp: any) => {
          const deptName = emp.departments?.name || 'Sin Asignar';
          const campusName = emp.campuses?.name || 'Sin Asignar';

          deptsMap[deptName] = (deptsMap[deptName] || 0) + 1;
          campusMap[campusName] = (campusMap[campusName] || 0) + 1;
        });

        setDeptStats(Object.entries(deptsMap).map(([name, count]) => ({
          name,
          count,
          percentage: (count / totalActive) * 100
        })).sort((a, b) => b.count - a.count));

        setCampusStats(Object.entries(campusMap).map(([name, count]) => ({
          name,
          count,
          percentage: (count / totalActive) * 100
        })).sort((a, b) => b.count - a.count));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Overview Administrativo</h1>
        <p>Resumen del estado del personal y solicitudes</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon-wrapper"><Users size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeEmployees}</span>
            <span className="stat-label">Empleados Activos</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon-wrapper"><UserMinus size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.inactiveEmployees}</span>
            <span className="stat-label">Empleados Inactivos</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon-wrapper"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingRequests}</span>
            <span className="stat-label">Solicitudes Pendientes</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon-wrapper"><CheckCircle size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.approvedRequests}</span>
            <span className="stat-label">Vacaciones Aprobadas</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-mockup" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="chart-header">
            <h3><BarChart4 size={18} color="var(--primary-color)" /> Empleados Activos por Departamento</h3>
          </div>
          <div className="chart-content">
            {deptStats.length > 0 ? deptStats.map((item, idx) => (
              <div className="bar-item" key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="bar-label">{item.name}</span>
                  <span className="bar-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.count}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${item.percentage}%`, background: 'var(--primary-gradient)' }}></div>
                </div>
              </div>
            )) : <p style={{ fontSize: '0.875rem' }}>No hay datos suficientes.</p>}
          </div>
        </div>

        <div className="card chart-mockup" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="chart-header">
            <h3><BarChart4 size={18} color="var(--primary-color)" /> Empleados Activos por Sede</h3>
          </div>
          <div className="chart-content">
            {campusStats.length > 0 ? campusStats.map((item, idx) => (
              <div className="bar-item" key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="bar-label">{item.name}</span>
                  <span className="bar-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.count}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${item.percentage}%`, background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)' }}></div>
                </div>
              </div>
            )) : <p style={{ fontSize: '0.875rem' }}>No hay datos suficientes.</p>}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header h1 {
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .dashboard-header p {
          color: var(--text-secondary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: var(--shadow-sm);
          border: 1px solid rgba(255, 255, 255, 0.5);
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }

        .stat-card.primary::before { background-color: var(--primary-color); }
        .stat-card.danger::before { background-color: var(--danger); }
        .stat-card.warning::before { background-color: var(--warning); }
        .stat-card.success::before { background-color: var(--success); }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .primary .stat-icon-wrapper { background: var(--info-bg); color: var(--primary-color); }
        .danger .stat-icon-wrapper { background: var(--danger-bg); color: var(--danger); }
        .warning .stat-icon-wrapper { background: var(--warning-bg); color: #d97706; }
        .success .stat-icon-wrapper { background: var(--success-bg); color: #059669; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
          font-weight: 500;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .chart-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .chart-header h3 {
          font-size: 1rem;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .chart-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bar-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .bar-track {
          height: 10px;
          background: var(--border-color);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }

        .bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
