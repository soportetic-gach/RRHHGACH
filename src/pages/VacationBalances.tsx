import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calculator, UserMinus, Plus, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function VacationBalances() {
    const { user, role } = useAuth();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [adjustmentData, setAdjustmentData] = useState({
        adjustmentType: 'increase',
        days: '',
        justification: ''
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('employees')
                .select(`
                    id, 
                    first_name, 
                    last_name, 
                    identification, 
                    vacation_days_available,
                    campus_id,
                    departments (name),
                    campuses (name),
                    photo_url,
                    vacation_requests(days_requested, status, leave_type)
                `)
                .eq('employee_status', 'ACTIVO');

            if (role === 'DIRECTOR_SEDE') {
                const { data: directorData } = await supabase.from('campus_directors').select('campus_id').eq('employee_id', user?.id);
                const campusIds = directorData?.map(d => d.campus_id) || [];
                if (campusIds.length > 0) {
                    query = query.in('campus_id', campusIds);
                } else {
                    // Si no tiene sedes asignadas, no mostramos nada
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data, error } = await query.order('first_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            toast.error('Error al cargar empleados');
        } finally {
            setLoading(false);
        }
    };

    const openAdjustmentModal = (emp: any) => {
        setSelectedEmployee(emp);
        setAdjustmentData({
            adjustmentType: 'increase',
            days: '',
            justification: ''
        });
        setIsModalOpen(true);
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);

            const adjustmentValue = parseFloat(adjustmentData.days);
            if (isNaN(adjustmentValue) || adjustmentValue <= 0) {
                toast.error('Por favor, ingresa una cantidad válida de días mayor a 0');
                return;
            }

            const currentBalance = parseFloat(selectedEmployee.vacation_days_available || 0);
            const isIncrease = adjustmentData.adjustmentType === 'increase';
            const finalAdjustment = isIncrease ? adjustmentValue : -adjustmentValue;
            const newBalance = currentBalance + finalAdjustment;

            // Transacción: Insertar el log y actualizar el saldo del empleado
            const { error: logError } = await supabase
                .from('vacation_balance_logs')
                .insert({
                    employee_id: selectedEmployee.id,
                    admin_id: user?.id, // ID del administrador (RRHH) realizando el ajuste
                    previous_balance: currentBalance,
                    adjustment: finalAdjustment,
                    new_balance: newBalance,
                    justification: adjustmentData.justification
                });

            if (logError) throw logError;

            const { error: empError } = await supabase
                .from('employees')
                .update({ vacation_days_available: newBalance })
                .eq('id', selectedEmployee.id);

            if (empError) throw empError;

            toast.success('Saldo ajustado correctamente');
            setIsModalOpen(false);
            fetchEmployees(); // Refrescar la lista
        } catch (error) {
            console.error('Error al ajustar el saldo', error);
            toast.error('Ocurrió un error al aplicar el ajuste');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.identification.includes(searchTerm)
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Saldos y Ajustes</h1>
                    <p>Gestiona los días disponibles de vacaciones y licencias para el personal</p>
                </div>
            </div>

            <div className="card">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o indentificación..."
                            className="form-input search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="loading-state">Cargando...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th>Departamento / Sede</th>
                                    <th>Saldo Inicial</th>
                                    <th>Días Utilizados</th>
                                    <th>Saldo Disponible</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div className="emp-info-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {emp.photo_url ? (
                                                        <img src={emp.photo_url} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>ID: {emp.identification}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.875rem' }}>{emp.departments?.name || 'N/A'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.campuses?.name || 'N/A'}</div>
                                            </td>
                                            {(() => {
                                                const usedDays = emp.vacation_requests?.filter((r: any) => r.status === 'APROBADO' && (!r.leave_type || ['Vacaciones', 'Día de Cumpleaños', 'Cambio por Horas Acumuladas'].includes(r.leave_type))).reduce((sum: number, r: any) => sum + Number(r.days_requested), 0) || 0;
                                                const currentBalance = emp.vacation_days_available || 0;
                                                const initialBalance = currentBalance + usedDays;
                                                return (
                                                    <>
                                                        <td>
                                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>
                                                                {initialBalance === 0 ? 'Sin días disponibles' : `${initialBalance} Días`}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: usedDays > 0 ? '#ef4444' : '#64748b' }}>
                                                                {usedDays} Días
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="badge" style={{ fontSize: '1rem', padding: '0.4rem 0.8rem', backgroundColor: currentBalance > 0 ? '#dcfce7' : '#fef2f2', color: currentBalance > 0 ? '#166534' : '#ef4444' }}>
                                                                {currentBalance === 0 ? 'Sin días disponibles' : `${currentBalance} Días`}
                                                            </span>
                                                        </td>
                                                    </>
                                                );
                                            })()}
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn-icon"
                                                        title="Ajustar Saldo Manualmente"
                                                        onClick={() => openAdjustmentModal(emp)}
                                                        style={{ padding: '0.375rem', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', color: 'var(--primary-color)', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Calculator size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                            <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem', color: '#94a3b8' }} />
                                            <p>No se encontraron empleados</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && selectedEmployee && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', boxShadow: 'var(--shadow-xl)', animation: 'slideIn 0.3s ease-out' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Ajustar Saldo: {selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAdjustment} style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Saldo actual disponible:</p>
                                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 700 }}>{selectedEmployee.vacation_days_available || 0} Días</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Tipo de Ajuste</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="adjustmentType"
                                                value="increase"
                                                checked={adjustmentData.adjustmentType === 'increase'}
                                                onChange={(e) => setAdjustmentData({ ...adjustmentData, adjustmentType: e.target.value })}
                                            />
                                            <span style={{ color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Plus size={16} /> Aumentar Días</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="adjustmentType"
                                                value="decrease"
                                                checked={adjustmentData.adjustmentType === 'decrease'}
                                                onChange={(e) => setAdjustmentData({ ...adjustmentData, adjustmentType: e.target.value })}
                                            />
                                            <span style={{ color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserMinus size={16} /> Disminuir Días</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Cantidad de Días a Ajustar</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        className="form-input"
                                        required
                                        value={adjustmentData.days}
                                        onChange={(e) => setAdjustmentData({ ...adjustmentData, days: e.target.value })}
                                    />
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Comentario de Justificación</label>
                                    <textarea
                                        className="form-input"
                                        required
                                        placeholder="Ej: Aprobación especial de gerencia, error de sistema previo, etc."
                                        style={{ minHeight: '80px', resize: 'vertical' }}
                                        value={adjustmentData.justification}
                                        onChange={(e) => setAdjustmentData({ ...adjustmentData, justification: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Procesando...' : 'Aplicar Ajuste'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
