import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar as CalendarIcon, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VacationsEmployee() {
    const { user } = useAuth();
    const [employeeData, setEmployeeData] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leaveType, setLeaveType] = useState('Vacaciones');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        if (employeeData && employeeData.vacation_days_available === 0) {
            setLeaveType('Permiso sin Goce de Salario');
        }
    }, [employeeData]);

    const fetchData = async () => {
        try {
            // Get employee info
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (empError) throw empError;
            setEmployeeData(empData);

            // Get requests
            const { data: reqData, error: reqError } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('employee_id', user?.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;
            setRequests(reqData || []);

        } catch (error) {
            console.error(error);
        }
    };

    const calculateDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return diffDays;
    };

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const requestedDays = calculateDays(startDate, endDate);

        if (requestedDays <= 0) {
            return toast.error('Rango de fechas inválido');
        }

        const consumesDays = ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(leaveType);

        if (consumesDays && requestedDays > employeeData?.vacation_days_available) {
            return toast.error(`Estás superando la cantidad de días disponibles (${employeeData?.vacation_days_available} días). Solicita tu saldo restante, y para más días usa "Permiso sin Goce de Salario".`, { duration: 6000 });
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('vacation_requests')
                .insert([{
                    employee_id: user?.id,
                    start_date: startDate,
                    end_date: endDate,
                    days_requested: requestedDays,
                    leave_type: leaveType,
                    status: 'PENDIENTE'
                }]);

            if (error) throw error;

            toast.success('Solicitud enviada correctamente');
            setStartDate('');
            setEndDate('');
            fetchData(); // Refresh list and balance
        } catch (error) {
            toast.error('Error al enviar solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Mis Vacaciones</h1>
                    <p>Consulta tus saldos y solicita días libres</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">

                {/* Balance Panel */}
                <div className="col-span-1">
                    <div className="card balance-card">
                        <h3 className="card-title">Saldo Disponible</h3>
                        {(() => {
                            const usedDays = requests.filter(r => r.status === 'APROBADO' && (!r.leave_type || ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(r.leave_type))).reduce((sum, r) => sum + Number(r.days_requested), 0) || 0;
                            const currentBalance = employeeData?.vacation_days_available || 0;
                            const initialBalance = currentBalance + usedDays;

                            return (
                                <>
                                    <div className="balance-amount" style={{ color: currentBalance > 0 ? 'var(--primary-color)' : '#ef4444' }}>
                                        {currentBalance === 0 ? '0' : currentBalance}
                                        <span className="balance-label">{currentBalance === 0 ? 'Sin días disponibles' : 'Días Libres'}</span>
                                    </div>

                                    <div className="balance-stats">
                                        <div className="stat-row">
                                            <span>Saldo Inicial Anual:</span>
                                            <strong>{initialBalance} Días</strong>
                                        </div>
                                        <div className="stat-row" style={{ marginTop: '0.4rem' }}>
                                            <span>Días Utilizados:</span>
                                            <strong style={{ color: usedDays > 0 ? '#ef4444' : 'inherit' }}>{usedDays} Días</strong>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div className="card request-card mt-6">
                        <h3 className="card-title">Nueva Solicitud</h3>
                        <form onSubmit={handleRequest} className="mt-4">
                            <div className="form-group">
                                <label className="form-label">Tipo de Permiso</label>
                                <select
                                    className="form-select"
                                    required
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                >
                                    {(employeeData?.vacation_days_available || 0) > 0 ? (
                                        <>
                                            <option value="Vacaciones">Vacaciones</option>
                                            <option value="Día de Cumpleaños">Día de Cumpleaños</option>
                                            <option value="Cambio por Horas Acumuladas">Cambio por Horas Acumuladas</option>
                                            <option value="Permiso Médico">Permiso Médico</option>
                                            <option value="Licencia por Maternidad/Paternidad">Licencia por Maternidad/Paternidad</option>
                                            <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                                            <option value="Permiso sin Goce de Salario">Permiso sin Goce de Salario</option>
                                        </>
                                    ) : (
                                        <option value="Permiso sin Goce de Salario">Permiso sin Goce de Salario</option>
                                    )}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Fecha de Inicio</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha de Fin</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate || new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>

                            {startDate && endDate && (
                                <div className="summary-alert">
                                    <AlertCircle size={16} />
                                    <span>Días solicitados: <strong>{calculateDays(startDate, endDate)}</strong></span>
                                </div>
                            )}

                            {startDate && endDate && ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(leaveType) && calculateDays(startDate, endDate) > (employeeData?.vacation_days_available || 0) && (
                                <div className="summary-alert" style={{ backgroundColor: '#fef2f2', color: '#ef4444', marginTop: '0.5rem', alignItems: 'flex-start' }}>
                                    <AlertCircle size={18} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                                        Estás superando la cantidad de días disponibles. Debes solicitar primero tus <strong>{employeeData?.vacation_days_available || 0}</strong> días restantes, y crear una solicitud adicional por "Permiso sin Goce de Salario" para los días extras.
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary w-full mt-4"
                                disabled={submitting}
                            >
                                <Send size={18} />
                                <span>{submitting ? 'Enviando...' : 'Enviar Solicitud'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* History Panel */}
                <div className="col-span-2">
                    <div className="card history-card">
                        <div className="history-header">
                            <h3 className="card-title">Historial de Solicitudes</h3>
                        </div>

                        <div className="table-container mt-4">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fechas</th>
                                        <th>Días</th>
                                        <th>Estado</th>
                                        <th>Fecha Solicitud</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => (
                                        <tr key={req.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon size={14} className="text-secondary" />
                                                    <span className="text-sm">
                                                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-secondary mt-1 block">
                                                    Tipo: {req.leave_type || 'Vacaciones'}
                                                </span>
                                            </td>
                                            <td className="font-semibold">{req.days_requested}</td>
                                            <td>
                                                {req.status === 'APROBADO' && <span className="badge badge-success">Aprobado</span>}
                                                {req.status === 'RECHAZADO' && <span className="badge badge-danger" title={req.rejection_reason}>Rechazado</span>}
                                                {req.status === 'PENDIENTE' && <span className="badge badge-warning">Pendiente</span>}
                                            </td>
                                            <td className="text-sm text-secondary">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-secondary">No tienes solicitudes previas</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            <style>{`
        .col-span-1 { grid-column: span 1 / span 1; }
        .col-span-2 { grid-column: span 2 / span 2; }
        .mt-6 { margin-top: 1.5rem; }
        .mt-4 { margin-top: 1rem; }
        .w-full { width: 100%; justify-content: center; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .text-center { text-align: center; }

        .card-title {
          font-size: 1.125rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          border-bottom: 2px solid var(--bg-color);
          padding-bottom: 0.75rem;
        }

        .balance-amount {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--primary-color);
          text-align: center;
          padding: 1rem 0;
          line-height: 1;
        }

        .balance-label {
          display: block;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .balance-stats {
          background: var(--bg-color);
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-top: 1rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .summary-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background-color: var(--info-bg);
          color: var(--primary-color);
          border-radius: var(--radius-md);
          margin-top: 1rem;
          font-size: 0.875rem;
        }

        @media (max-width: 1024px) {
          .col-span-1, .col-span-2 {
            grid-column: span 3 / span 3;
          }
        }
      `}</style>
        </div>
    );
}
