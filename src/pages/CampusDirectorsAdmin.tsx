import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCog, Plus, Trash2, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampusDirectorsAdmin() {
    const [campuses, setCampuses] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [directors, setDirectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        campus_id: '',
        employee_id: ''
    });

    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [campusesData, employeesData, directorsData] = await Promise.all([
                supabase.from('campuses').select('*').order('name'),
                supabase.from('employees').select('id, first_name, last_name, identification, campus_id').eq('employee_status', 'ACTIVO').order('first_name'),
                supabase.from('campus_directors').select(`
                    id,
                    campus_id,
                    employee_id,
                    campuses(name),
                    employees(first_name, last_name, identification, photo_url)
                `)
            ]);

            if (campusesData.error) throw campusesData.error;
            if (employeesData.error) throw employeesData.error;
            if (directorsData.error) throw directorsData.error;

            setCampuses(campusesData.data || []);
            setEmployees(employeesData.data || []);
            setDirectors(directorsData.data || []);

            if (campusesData.data && campusesData.data.length > 0) {
                setFormData(prev => ({ ...prev, campus_id: campusesData.data[0].id }));
            }
        } catch (error: any) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsAssigning(true);

            // Assign director
            const { error: insertError } = await supabase.from('campus_directors').insert([{
                campus_id: formData.campus_id,
                employee_id: formData.employee_id
            }]);

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('Este funcionario ya es director de esta sede');
                }
                throw insertError;
            }

            // Assign role DIRECTOR_SEDE
            const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'DIRECTOR_SEDE').single();
            if (roleData) {
                // Ignore unique violation if user already has role
                await supabase.from('user_roles').insert([{ user_id: formData.employee_id, role_id: roleData.id }]);
            }

            toast.success('Director asignado exitosamente');
            setFormData(prev => ({ ...prev, employee_id: '' }));
            fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Error al asignar director');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('¿Está seguro de remover a este director?')) return;
        try {
            const { error } = await supabase.from('campus_directors').delete().eq('id', id);
            if (error) throw error;

            toast.success('Director removido exitosamente');

            // NOTE: We don't necessarily remove DIRECTOR_SEDE role because they might be director of another campus
            // In a strict implementation, we would check if they have other campus_directors active records

            fetchData();
        } catch (error: any) {
            toast.error('Error al remover director');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserCog className="text-primary-color" size={28} />
                        Directores de Sede
                    </h1>
                    <p>Gestiona los directores y gerentes encargados de aprobar solicitudes por sede</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Asignar Nuevo Director</h3>
                    <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Seleccionar Sede</label>
                            <select
                                className="form-select"
                                required
                                value={formData.campus_id}
                                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                            >
                                {campuses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Seleccionar Funcionario</label>
                            <select
                                className="form-select"
                                required
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            >
                                <option value="">-- Seleccione Encargado --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.identification})</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isAssigning || !formData.employee_id} style={{ marginTop: '0.5rem' }}>
                            <Plus size={18} />
                            Asignar Responsabilidad
                        </button>
                    </form>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0 }}>Directores Activos</h3>
                    </div>

                    <div className="table-container">
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sede</th>
                                        <th>Director Asignado</th>
                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {directors.length > 0 ? (
                                        directors.map(dir => (
                                            <tr key={dir.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                                        <Building2 size={16} className="text-secondary" />
                                                        {dir.campuses?.name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {dir.employees?.photo_url ? (
                                                            <img src={dir.employees.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                                                                <User size={16} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>{dir.employees?.first_name} {dir.employees?.last_name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {dir.employees?.identification}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button onClick={() => handleRemove(dir.id)} className="btn btn-danger" style={{ padding: '0.4rem', borderRadius: '6px' }} title="Remover Director">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                No hay directores asignados a ninguna sede todavía.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
                .page-header { display: flex; justify-content: space-between; align-items: center; }
                .page-header h1 { font-size: 1.5rem; color: var(--text-primary); margin: 0; }
                .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
                .text-primary-color { color: var(--primary-color); }
                .text-secondary { color: var(--text-secondary); }
            `}</style>
        </div>
    );
}
