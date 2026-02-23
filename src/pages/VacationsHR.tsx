import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Search, Calendar as CalendarIcon, UserPlus, FileText, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function VacationsHR() {
    const { role } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'solicitudes' | 'manual'>('solicitudes');
    const [searchEmp, setSearchEmp] = useState('');

    const [manualForm, setManualForm] = useState({
        employee_id: '',
        start_date: '',
        end_date: '',
        days_requested: '',
        leave_type: 'Vacaciones'
    });

    const [editModal, setEditModal] = useState({
        isOpen: false,
        requestId: '',
        employee_id: '',
        start_date: '',
        end_date: '',
        days_requested: '',
        leave_type: 'Vacaciones',
        old_days_requested: 0,
        old_leave_type: ''
    });

    const handleEdit = (req: any) => {
        setEditModal({
            isOpen: true,
            requestId: req.id,
            employee_id: req.employee_id,
            start_date: req.start_date,
            end_date: req.end_date,
            days_requested: req.days_requested,
            leave_type: req.leave_type || 'Vacaciones',
            old_days_requested: parseFloat(req.days_requested),
            old_leave_type: req.leave_type || 'Vacaciones'
        });
    };

    useEffect(() => {
        if (activeTab === 'solicitudes') {
            fetchRequests();
        } else {
            fetchEmployees();
        }
    }, [activeTab]);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, first_name, last_name, identification, vacation_days_available')
                .eq('employee_status', 'ACTIVO')
                .order('first_name');
            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            toast.error('Error al cargar empleados');
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vacation_requests')
                .select(`
          *,
          employees (
            first_name,
            last_name,
            identification,
            vacation_days_available,
            departments (name),
            campuses (name)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            toast.error('Error al cargar solicitudes');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, hrApproved: boolean, mgmtApproved: boolean) => {
        try {
            const request = requests.find(r => r.id === id);
            if (!request) return;

            let updatePayload: any = {};
            let isBecomingApproved = false;

            if (role === 'RRHH' || role === 'ADMIN_TI') {
                updatePayload.hr_approved = true;
                // Si ya estaba aprobado por gerencia o si es el unico paso necesario (depende de logica)
                // Para el caso Multinivel: Si gerencia ya aprobó o si no, el status se actualiza si ambos aprueban.
                if (mgmtApproved) {
                    updatePayload.status = 'APROBADO';
                    isBecomingApproved = true;
                }
            }

            if (role === 'GERENCIA' || role === 'ADMIN_TI') {
                updatePayload.management_approved = true;
                if (hrApproved || role === 'ADMIN_TI') {
                    updatePayload.status = 'APROBADO';
                    isBecomingApproved = true;
                }
            }

            const { error } = await supabase
                .from('vacation_requests')
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;

            if (isBecomingApproved && (!request.leave_type || ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(request.leave_type))) {
                const currentBalance = request.employees.vacation_days_available;
                const newBalance = currentBalance - request.days_requested;

                const { error: empError } = await supabase
                    .from('employees')
                    .update({ vacation_days_available: newBalance })
                    .eq('id', request.employee_id);

                if (!empError) {
                    const { data: userData } = await supabase.auth.getUser();
                    if (userData.user) {
                        await supabase.from('vacation_balance_logs').insert([{
                            employee_id: request.employee_id,
                            admin_id: userData.user.id,
                            previous_balance: currentBalance,
                            adjustment: -request.days_requested,
                            new_balance: newBalance,
                            justification: `Aprobación de Solicitud #${id.substring(0, 8)}`
                        }]);
                    }
                }
            }

            toast.success('Solicitud aprobada correctamente');
            fetchRequests();
        } catch (error) {
            toast.error('Error al aprobar solicitud');
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt("Motivo del rechazo:");
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('vacation_requests')
                .update({ status: 'RECHAZADO', rejection_reason: reason })
                .eq('id', id);

            if (error) throw error;
            toast.success('Solicitud rechazada');
            fetchRequests();
        } catch (error) {
            toast.error('Error al rechazar solicitud');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APROBADO': return <span className="badge badge-success">Aprobado</span>;
            case 'RECHAZADO': return <span className="badge badge-danger">Rechazado</span>;
            default: return <span className="badge badge-warning">Pendiente</span>;
        }
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Gestión de Permisos</h1>
                    <p>Flujo multinivel para RRHH y Gerencia</p>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'solicitudes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('solicitudes')}
                    >
                        <FileText size={18} />
                        Bandeja de Aprobaciones
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                        onClick={() => setActiveTab('manual')}
                    >
                        <UserPlus size={18} />
                        Creación Manual
                    </button>
                </div>
            </div>

            {activeTab === 'solicitudes' ? (
                <div className="card">
                    <div className="filters-bar">
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar colaborador..."
                                className="form-input search-input"
                            />
                        </div>
                        <div className="filter-selects">
                            <select className="form-select">
                                <option value="">Estado: Todos</option>
                                <option value="PENDIENTE">Pendientes</option>
                                <option value="APROBADO">Aprobadas</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-container">
                        {loading ? (
                            <div className="loading-state">Cargando solicitudes...</div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Colaborador</th>
                                        <th>Dep / Sede</th>
                                        <th>Fechas</th>
                                        <th>Tipo</th>
                                        <th>Días Solicitados</th>
                                        <th>Estado Actual</th>
                                        <th>Aprobaciones</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => (
                                        <tr key={req.id}>
                                            <td>
                                                <div className="emp-name">{req.employees.first_name} {req.employees.last_name}</div>
                                                <div className="emp-email text-xs">ID: {req.employees.identification}</div>
                                            </td>
                                            <td>
                                                <div className="text-sm">{req.employees.departments?.name}</div>
                                                <div className="text-xs text-secondary">{req.employees.campuses?.name}</div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CalendarIcon size={14} className="text-secondary" />
                                                    <span>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#334155' }}>
                                                    {req.leave_type || 'Vacaciones'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="font-semibold">{req.days_requested}</span>
                                                <span className="text-xs text-secondary block">saldo: {req.employees.vacation_days_available}</span>
                                            </td>
                                            <td>{getStatusBadge(req.status)}</td>
                                            <td>
                                                <div className="approval-status">
                                                    <span className={`approval-dot ${req.hr_approved ? 'approved' : 'pending'}`} title="RRHH">R</span>
                                                    <span className={`approval-dot ${req.management_approved ? 'approved' : 'pending'}`} title="Gerencia">G</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons" style={{ display: 'flex', gap: '0.25rem' }}>
                                                    {req.status === 'PENDIENTE' && (
                                                        <>
                                                            <button
                                                                className="btn-icon text-success hover-bg-success"
                                                                title="Aprobar"
                                                                onClick={() => handleApprove(req.id, req.hr_approved, req.management_approved)}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                className="btn-icon text-danger hover-bg-danger"
                                                                title="Rechazar"
                                                                onClick={() => handleReject(req.id)}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === 'APROBADO' && (role === 'RRHH' || role === 'ADMIN_TI') && (
                                                        <button
                                                            className="btn-icon"
                                                            title="Modificar"
                                                            onClick={() => handleEdit(req)}
                                                            style={{ color: 'var(--primary-color)' }}
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="empty-state">No hay solicitudes para mostrar.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="section-title" style={{ marginTop: 0, paddingBottom: '1rem' }}>Crear Registro de Ausencia</div>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!manualForm.employee_id) return toast.error('Debe seleccionar un empleado');

                        try {
                            setLoading(true);
                            // Se registra como si RRHH y Gerencia ya aprobaran directamente
                            const { data: insertedData, error } = await supabase.from('vacation_requests').insert({
                                employee_id: manualForm.employee_id,
                                start_date: manualForm.start_date,
                                end_date: manualForm.end_date,
                                days_requested: parseFloat(manualForm.days_requested),
                                leave_type: manualForm.leave_type,
                                status: 'APROBADO',
                                hr_approved: true,
                                management_approved: true
                            }).select();

                            if (error) throw error;

                            // Si es vacaciones y se restan de los dias.
                            if (['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(manualForm.leave_type)) {
                                const hrEmployee = employees.find(e => e.id === manualForm.employee_id);
                                if (hrEmployee) {
                                    const requestedDays = parseFloat(manualForm.days_requested);
                                    const currentBalance = hrEmployee.vacation_days_available;
                                    const newBalance = currentBalance - requestedDays;

                                    const { error: empError } = await supabase
                                        .from('employees')
                                        .update({ vacation_days_available: newBalance })
                                        .eq('id', manualForm.employee_id);

                                    if (!empError) {
                                        const { data: userData } = await supabase.auth.getUser();
                                        if (userData.user && insertedData && insertedData.length > 0) {
                                            await supabase.from('vacation_balance_logs').insert([{
                                                employee_id: manualForm.employee_id,
                                                admin_id: userData.user.id,
                                                previous_balance: currentBalance,
                                                adjustment: -requestedDays,
                                                new_balance: newBalance,
                                                justification: `Creación Manual de Vacaciones #${insertedData[0].id.substring(0, 8)}`
                                            }]);
                                        }
                                    }
                                }
                            }

                            toast.success('Permiso registrado correctamente');
                            setManualForm({ employee_id: '', start_date: '', end_date: '', days_requested: '', leave_type: 'Vacaciones' });
                            setSearchEmp('');
                        } catch (error) {
                            toast.error('Error al registrar el permiso');
                        } finally {
                            setLoading(false);
                        }
                    }} className="modal-body form-grid">

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Buscar Colaborador</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Escribe para buscar..."
                                value={searchEmp}
                                onChange={(e) => setSearchEmp(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Funcionario Seleccionado</label>
                            <select
                                className="form-select"
                                required
                                value={manualForm.employee_id}
                                onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                            >
                                <option value="">-- Seleccione un funcionario --</option>
                                {employees.filter(emp =>
                                    (emp.first_name + ' ' + emp.last_name + ' ' + emp.identification).toLowerCase().includes(searchEmp.toLowerCase())
                                ).map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} - {emp.identification} (Saldo Días: {emp.vacation_days_available})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Tipo de Ausencia / Permiso</label>
                            <select
                                className="form-select"
                                required
                                value={manualForm.leave_type}
                                onChange={(e) => setManualForm({ ...manualForm, leave_type: e.target.value })}
                            >
                                <option value="Vacaciones">Vacaciones</option>
                                <option value="Día de Cumpleaños">Día de Cumpleaños</option>
                                <option value="Cambio por Horas Acumuladas">Cambio por Horas Acumuladas</option>
                                <option value="Permiso Médico">Permiso Médico</option>
                                <option value="Licencia por Maternidad/Paternidad">Licencia por Maternidad/Paternidad</option>
                                <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                                <option value="Permiso sin Goce de Salario">Permiso sin Goce de Salario</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Fecha de Inicio</label>
                            <input
                                type="date"
                                className="form-input"
                                required
                                value={manualForm.start_date}
                                onChange={(e) => setManualForm({ ...manualForm, start_date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Fecha de Conclusión</label>
                            <input
                                type="date"
                                className="form-input"
                                required
                                value={manualForm.end_date}
                                onChange={(e) => setManualForm({ ...manualForm, end_date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Días Hábiles Solicitados / Aprobados</label>
                            <input
                                type="number"
                                step="0.5"
                                className="form-input"
                                required
                                value={manualForm.days_requested}
                                onChange={(e) => setManualForm({ ...manualForm, days_requested: e.target.value })}
                            />
                        </div>

                        <div className="form-group empty-group"></div>

                        <div className="modal-footer" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Registrar Aprobación y Aplicar'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {editModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', boxShadow: 'var(--shadow-xl)', animation: 'slideIn 0.3s ease-out' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Modificar Solicitud</h2>
                            <button onClick={() => setEditModal({ ...editModal, isOpen: false })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                setLoading(true);
                                const newDays = parseFloat(editModal.days_requested);

                                const { error } = await supabase.from('vacation_requests').update({
                                    start_date: editModal.start_date,
                                    end_date: editModal.end_date,
                                    days_requested: newDays,
                                    leave_type: editModal.leave_type
                                }).eq('id', editModal.requestId);

                                if (error) throw error;

                                const diffDays = newDays - editModal.old_days_requested;
                                const consumesDays = (type: string) => ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(type || 'Vacaciones');
                                const isNewVacation = consumesDays(editModal.leave_type);
                                const wasVacation = consumesDays(editModal.old_leave_type);

                                let totalDaysAdjustment = 0;
                                if (wasVacation && isNewVacation) {
                                    totalDaysAdjustment = diffDays;
                                } else if (wasVacation && !isNewVacation) {
                                    totalDaysAdjustment = -editModal.old_days_requested;
                                } else if (!wasVacation && isNewVacation) {
                                    totalDaysAdjustment = newDays;
                                }

                                if (totalDaysAdjustment !== 0) {
                                    const hrEmployee = employees.find(e => e.id === editModal.employee_id);
                                    if (hrEmployee) {
                                        const currentBalance = hrEmployee.vacation_days_available;
                                        const newBalance = currentBalance - totalDaysAdjustment;

                                        const { error: empError } = await supabase
                                            .from('employees')
                                            .update({ vacation_days_available: newBalance })
                                            .eq('id', editModal.employee_id);

                                        if (!empError) {
                                            const { data: userData } = await supabase.auth.getUser();
                                            if (userData.user) {
                                                await supabase.from('vacation_balance_logs').insert([{
                                                    employee_id: editModal.employee_id,
                                                    admin_id: userData.user.id,
                                                    previous_balance: currentBalance,
                                                    adjustment: -totalDaysAdjustment,
                                                    new_balance: newBalance,
                                                    justification: `Modificación de Permiso #${editModal.requestId.substring(0, 8)}`
                                                }]);
                                            }
                                        }
                                    }
                                }
                                toast.success('Solicitud actualizada correctamente');
                                setEditModal({ ...editModal, isOpen: false });
                                fetchRequests();
                            } catch (error) {
                                toast.error('Error al actualizar');
                            } finally {
                                setLoading(false);
                            }
                        }} style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Tipo de Ausencia</label>
                                    <select
                                        className="form-select"
                                        required
                                        value={editModal.leave_type}
                                        onChange={(e) => setEditModal({ ...editModal, leave_type: e.target.value })}
                                    >
                                        <option value="Vacaciones">Vacaciones</option>
                                        <option value="Día de Cumpleaños">Día de Cumpleaños</option>
                                        <option value="Cambio por Horas Acumuladas">Cambio por Horas Acumuladas</option>
                                        <option value="Permiso Médico">Permiso Médico</option>
                                        <option value="Licencia por Maternidad/Paternidad">Licencia por Maternidad/Paternidad</option>
                                        <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                                        <option value="Permiso sin Goce de Salario">Permiso sin Goce de Salario</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha de Inicio</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        required
                                        value={editModal.start_date}
                                        onChange={(e) => setEditModal({ ...editModal, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha de Conclusión</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        required
                                        value={editModal.end_date}
                                        onChange={(e) => setEditModal({ ...editModal, end_date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Días Hábiles</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="form-input"
                                        required
                                        value={editModal.days_requested}
                                        onChange={(e) => setEditModal({ ...editModal, days_requested: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <button type="button" className="btn" onClick={() => setEditModal({ ...editModal, isOpen: false })}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        /* Reuse styles from Employees.tsx plus new specific ones */
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-secondary { color: var(--text-secondary); }
        .font-semibold { font-weight: 600; }
        
        .approval-status {
          display: flex;
          gap: 0.25rem;
        }

        .approval-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: bold;
          color: white;
        }

        .approval-dot.approved { background-color: var(--success); }
        .approval-dot.pending { background-color: #cbd5e1; }

        .text-success { color: var(--success); }
        .text-danger { color: var(--danger); }
        .hover-bg-success:hover { background-color: var(--success-bg); }
        .hover-bg-danger:hover { background-color: var(--danger-bg); }

        .tabs-container {
            display: flex;
            background: #f1f5f9;
            padding: 0.3rem;
            border-radius: var(--radius-lg);
            gap: 0.3rem;
        }

        .tab-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 1.25rem;
            border: none;
            background: transparent;
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab-btn.active {
            background: white;
            color: var(--primary-color);
            box-shadow: var(--shadow-sm);
        }

        .tab-btn:hover:not(.active) {
            color: var(--text-primary);
        }

        /* Re-use from Employees */
        .modal-body { padding: 1.5rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .section-title { grid-column: 1 / -1; font-weight: 600; color: var(--primary-color); border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1.1rem; }
        
        @media (max-width: 768px) { 
            .form-grid { grid-template-columns: 1fr; } 
            .empty-group { display: none; }
            .page-header { flex-direction: column; gap: 1.5rem; align-items: stretch !important; }
        }
      `}</style>
        </div>
    );
}
