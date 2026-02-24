import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calculator, UserMinus, Plus, ShieldAlert, X, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ExtraHoursControl() {
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
        hours: '',
        justification: ''
    });

    // Report Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [reportEmployee, setReportEmployee] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        if (role) {
            fetchEmployees();
        }
    }, [role, user]);

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
                    accumulated_hours,
                    campus_id,
                    departments (name),
                    campuses (name),
                    photo_url
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
            hours: '',
            justification: ''
        });
        setIsModalOpen(true);
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);

            const adjustmentValue = parseFloat(adjustmentData.hours);
            if (isNaN(adjustmentValue) || adjustmentValue <= 0) {
                toast.error('Por favor, ingresa una cantidad válida de horas mayor a 0');
                return;
            }

            const currentBalance = parseFloat(selectedEmployee.accumulated_hours || 0);
            const isIncrease = adjustmentData.adjustmentType === 'increase';
            const finalAdjustment = isIncrease ? adjustmentValue : -adjustmentValue;
            const newBalance = currentBalance + finalAdjustment;

            // Transacción: Insertar el log y actualizar el saldo del empleado
            const { error: logError } = await supabase
                .from('accumulated_hours_logs')
                .insert({
                    employee_id: selectedEmployee.id,
                    admin_id: user?.id,
                    previous_hours: currentBalance,
                    adjustment: finalAdjustment,
                    new_hours: newBalance,
                    justification: adjustmentData.justification
                });

            if (logError) throw logError;

            const { error: empError } = await supabase
                .from('employees')
                .update({ accumulated_hours: newBalance })
                .eq('id', selectedEmployee.id);

            if (empError) throw empError;

            toast.success('Horas ajustadas correctamente');
            setIsModalOpen(false);
            fetchEmployees();
        } catch (error) {
            console.error('Error al ajustar las horas', error);
            toast.error('Ocurrió un error al aplicar el ajuste');
        } finally {
            setSaving(false);
        }
    };

    const openReportModal = async (emp: any) => {
        setReportEmployee(emp);
        setReportModalOpen(true);
        setLoadingReport(true);
        try {
            // Fetch logs for this employee
            const { data: logsData, error: logsError } = await supabase
                .from('accumulated_hours_logs')
                .select('created_at, previous_hours, adjustment, new_hours, justification')
                .eq('employee_id', emp.id)
                .order('created_at', { ascending: false });

            if (logsError) throw logsError;

            // Fetch vacation requests that are Cambio por Horas Acumuladas
            const { data: reqData, error: reqError } = await supabase
                .from('vacation_requests')
                .select('created_at, start_date, end_date, days_requested, status, leave_type')
                .eq('employee_id', emp.id)
                .eq('status', 'APROBADO')
                .eq('leave_type', 'Cambio por Horas Acumuladas')
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            const combinedData = [];

            if (logsData) {
                for (const log of logsData) {
                    combinedData.push({
                        type: 'MOVIMIENTO_ALTA',
                        date: new Date(log.created_at),
                        label: log.justification || 'Ajuste Manual',
                        hours: log.adjustment,
                        affectsBalance: true
                    });
                }
            }

            if (reqData) {
                for (const req of reqData) {
                    combinedData.push({
                        type: 'SOLICITUD',
                        date: new Date(req.created_at),
                        label: `Aprobación: Cambio por Horas Acum.`,
                        hours: -(req.days_requested * 8), // assuming days * 8 hours
                        affectsBalance: true
                    });
                }
            }

            combinedData.sort((a, b) => b.date.getTime() - a.date.getTime());
            setReportData(combinedData);

        } catch (error) {
            toast.error('Error al cargar movimientos de horas');
        } finally {
            setLoadingReport(false);
        }
    };

    const handlePrint = () => {
        window.print();
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
                    <h1>Control de Horas Extras</h1>
                    <p>
                        Gestiona las horas extras o acumuladas por el personal de tu sede.
                    </p>
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
                                    <th>Horas Extras Acumuladas</th>
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
                                            <td>
                                                <span style={{ fontSize: '1rem', fontWeight: 600, color: (emp.accumulated_hours || 0) > 0 ? '#f59e0b' : '#64748b' }}>
                                                    {emp.accumulated_hours || 0} Horas
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn-icon"
                                                        title="Ver Movimientos (PDF)"
                                                        onClick={() => openReportModal(emp)}
                                                        style={{ padding: '0.375rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        title="Años / Horas Manuales"
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
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
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
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fbd38d' }}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Horas Acumuladas Actuales:</p>
                                <p style={{ margin: '0.5rem 0 0 0', color: '#f59e0b', fontSize: '1.5rem', fontWeight: 700 }}>{selectedEmployee.accumulated_hours || 0} Horas</p>
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
                                            <span style={{ color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Plus size={16} /> Aumentar Horas</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="adjustmentType"
                                                value="decrease"
                                                checked={adjustmentData.adjustmentType === 'decrease'}
                                                onChange={(e) => setAdjustmentData({ ...adjustmentData, adjustmentType: e.target.value })}
                                            />
                                            <span style={{ color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserMinus size={16} /> Disminuir Horas</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Cantidad a Ajustar (Horas)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        className="form-input"
                                        required
                                        value={adjustmentData.hours}
                                        onChange={(e) => setAdjustmentData({ ...adjustmentData, hours: e.target.value })}
                                        placeholder="Ej: 8"
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

            {/* Print Modal Overlay */}
            {reportModalOpen && reportEmployee && (
                <div className="modal-overlay dont-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', animation: 'slideIn 0.3s ease-out' }}>
                        <div className="modal-header dont-print" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Movimientos de Saldo: {reportEmployee.first_name} {reportEmployee.last_name}</h2>
                            <button className="modal-close" onClick={() => setReportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body" id="print-section" style={{ padding: '2rem' }}>
                            <div className="print-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Reporte de Movimientos de Vacaciones y Licencias</h3>
                                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)' }}><strong>Colaborador:</strong> {reportEmployee.first_name} {reportEmployee.last_name}</p>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>Identificación:</strong> {reportEmployee.identification} | <strong>Departamento:</strong> {reportEmployee.departments?.name || 'N/A'}</p>
                            </div>

                            {loadingReport ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando datos...</div>
                            ) : (
                                <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '0.75rem', textAlign: 'left', background: '#f8fafc', color: 'var(--text-primary)' }}>Fecha</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '0.75rem', textAlign: 'left', background: '#f8fafc', color: 'var(--text-primary)' }}>Descripción / Tipo</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '0.75rem', textAlign: 'center', background: '#f8fafc', color: 'var(--text-primary)' }}>Horas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length > 0 ? reportData.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    {item.date.toLocaleDateString()}
                                                </td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    {item.label}
                                                </td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: item.hours > 0 ? '#16a34a' : '#ef4444' }}>
                                                    {item.hours > 0 ? `+${item.hours}` : item.hours}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', border: '1px solid #e2e8f0', color: '#64748b' }}>
                                                    No hay movimientos registrados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            <div className="dont-print modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button className="btn" onClick={() => setReportModalOpen(false)}>Cerrar</button>
                                <button className="btn btn-primary" onClick={handlePrint} disabled={loadingReport || reportData.length === 0} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Printer size={18} /> Imprimir / PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .btn-icon:hover { background: #e2e8f0 !important; color: var(--primary-color) !important; }

                @media print {
                    body * { visibility: hidden; }
                    .dont-print { display: none !important; }
                    #print-section, #print-section * { visibility: visible; }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print-table th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
                }

                @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
