import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Search, X, ShieldAlert, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SiteAdmins() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, rolesRes, userRolesRes] = await Promise.all([
                supabase.from('employees').select('id, first_name, last_name, email, identification, photo_url').order('first_name', { ascending: true }),
                supabase.from('roles').select('*').order('id', { ascending: true }),
                supabase.from('user_roles').select('*')
            ]);

            if (empRes.error) throw empRes.error;
            if (rolesRes.error) throw rolesRes.error;
            if (userRolesRes.error) throw userRolesRes.error;

            setEmployees(empRes.data || []);
            setRoles(rolesRes.data || []);
            setUserRoles(userRolesRes.data || []);
        } catch (error: any) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const getEmployeeRoles = (employeeId: string) => {
        const empRoleIds = userRoles.filter(ur => ur.user_id === employeeId).map(ur => ur.role_id);
        const empRoleNames = roles.filter(r => empRoleIds.includes(r.id)).map(r => r.name);
        return empRoleNames;
    };

    const openModal = (emp: any) => {
        setEditingEmployee(emp);
        const currentRoles = userRoles.filter(ur => ur.user_id === emp.id).map(ur => ur.role_id);
        setSelectedRoleIds(currentRoles);
        setIsModalOpen(true);
    };

    const handleToggleRole = (roleId: number) => {
        if (selectedRoleIds.includes(roleId)) {
            setSelectedRoleIds(selectedRoleIds.filter(id => id !== roleId));
        } else {
            setSelectedRoleIds([...selectedRoleIds, roleId]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);

            // Validate: need at least one role
            if (selectedRoleIds.length === 0) {
                toast.error('El usuario debe tener al menos un rol asignado.');
                return;
            }

            // Delete current roles
            const { error: deleteError } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', editingEmployee.id);

            if (deleteError) throw deleteError;

            // Insert new roles
            const { error: insertError } = await supabase
                .from('user_roles')
                .insert(selectedRoleIds.map(roleId => ({
                    user_id: editingEmployee.id,
                    role_id: roleId
                })));

            if (insertError) throw insertError;

            toast.success('Permisos actualizados correctamente');
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al actualizar permisos');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.identification.includes(searchTerm)
    );

    const getRoleBadgeColor = (roleName: string) => {
        switch (roleName) {
            case 'ADMIN_TI': return 'badge-danger'; // Usually red/critical
            case 'RRHH': return 'badge-warning';
            case 'GERENCIA': return 'badge-primary';
            case 'DIRECTOR_SEDE': return 'badge-info';
            case 'EMPLEADO': return 'badge-success';
            default: return 'badge-info';
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Administradores del Sitio</h1>
                    <p>Gestiona los niveles de acceso y módulos habilitados por usuario</p>
                </div>
            </div>

            <div className="card">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            className="form-input search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="loading-state">Cargando usuarios...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Identificación</th>
                                    <th>Roles Asignados</th>
                                    <th>Ajustes de Permisos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => {
                                        const empRoles = getEmployeeRoles(emp.id);
                                        return (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div className="emp-info-wrap">
                                                        {emp.photo_url ? (
                                                            <img src={emp.photo_url} alt="Profile" className="emp-avatar-small" />
                                                        ) : (
                                                            <div className="emp-avatar-placeholder">{emp.first_name.charAt(0)}{emp.last_name.charAt(0)}</div>
                                                        )}
                                                        <div>
                                                            <div className="emp-name">{emp.first_name} {emp.last_name}</div>
                                                            <div className="emp-email">{emp.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{emp.identification}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {empRoles.length > 0 ? empRoles.map(r => (
                                                            <span key={r} className={`badge ${getRoleBadgeColor(r)}`}>{r}</span>
                                                        )) : (
                                                            <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Sin Roles</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => openModal(emp)}>
                                                        <Shield size={16} style={{ marginRight: '0.5rem' }} /> Configurar Acceso
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="empty-state">
                                            <ShieldAlert size={32} />
                                            <p>No se encontraron usuarios</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && editingEmployee && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h2>Configurar Permisos de Sistema</h2>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-body">
                            <div className="emp-info-wrap" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {editingEmployee.photo_url ? (
                                    <img src={editingEmployee.photo_url} alt="Profile" className="emp-avatar-small" style={{ width: '48px', height: '48px' }} />
                                ) : (
                                    <div className="emp-avatar-placeholder" style={{ width: '48px', height: '48px' }}>{editingEmployee.first_name.charAt(0)}{editingEmployee.last_name.charAt(0)}</div>
                                )}
                                <div>
                                    <div className="emp-name" style={{ fontSize: '1.1rem' }}>{editingEmployee.first_name} {editingEmployee.last_name}</div>
                                    <div className="emp-email">{editingEmployee.email} • ID: {editingEmployee.identification}</div>
                                </div>
                            </div>

                            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Selecciona los módulos a los que el usuario tendrá acceso administrador. Un usuario puede tener múltiples roles para acceder a diferentes pantallas combinadas.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                {roles.map(role => (
                                    <label key={role.id} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '1rem',
                                        padding: '1rem',
                                        border: `2px solid ${selectedRoleIds.includes(role.id) ? 'var(--primary-color)' : '#e2e8f0'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: selectedRoleIds.includes(role.id) ? '#f0f4ff' : 'white',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{
                                            minWidth: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            border: `2px solid ${selectedRoleIds.includes(role.id) ? 'var(--primary-color)' : '#cbd5e1'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: selectedRoleIds.includes(role.id) ? 'var(--primary-color)' : 'transparent',
                                            marginTop: '0.125rem'
                                        }}>
                                            {selectedRoleIds.includes(role.id) && <Check size={16} color="white" strokeWidth={3} />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedRoleIds.includes(role.id)}
                                            onChange={() => handleToggleRole(role.id)}
                                            style={{ display: 'none' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Rol: {role.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {role.name === 'ADMIN_TI' && 'Control total del sistema (Catálogos, Parámetros, Permisos de Sistema).'}
                                                {role.name === 'RRHH' && 'Gestión de Expedientes de Empleados, Cumpleaños, Contabilidad de Vacaciones Globales.'}
                                                {role.name === 'GERENCIA' && 'Aprobaciones finales en segundo hilo para Jefaturas.'}
                                                {role.name === 'DIRECTOR_SEDE' && 'Aprobaciones de primer nivel (sede) y reporte de personal de su ubicación local.'}
                                                {role.name === 'EMPLEADO' && 'Acceso estándar. Mi Perfil y Mis Vacaciones Personales.'}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Guardando Roles...' : 'Guardar y Aplicar Permisos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }

            <style>{`
                .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
                .page-header { display: flex; justify-content: space-between; align-items: center; }
                .page-header h1 { font-size: 1.5rem; color: var(--text-primary); }
                .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
                .filters-bar { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
                .search-box { position: relative; flex: 1; max-width: 400px; min-width: 300px; }
                .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
                .search-input { width: 100%; padding-left: 2.5rem; }
                .emp-name { font-weight: 500; color: var(--text-primary); }
                .emp-email { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem; }
                .empty-state { text-align: center; padding: 3rem 1rem !important; color: var(--text-secondary); }
                .empty-state svg { margin-bottom: 0.75rem; color: #94a3b8; }
                .loading-state { padding: 3rem; text-align: center; color: var(--text-secondary); }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { background: var(--surface-color); border-radius: var(--radius-lg); width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slideIn 0.3s ease-out; }
                .modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
                .modal-header h2 { font-size: 1.25rem; margin: 0; color: var(--text-primary); }
                .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.25rem; display: flex; }
                .modal-close:hover { color: var(--text-primary); }
                .modal-body { padding: 1.5rem; }
                .emp-info-wrap { display: flex; align-items: center; gap: 0.75rem; }
                .emp-avatar-small { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0; }
                .emp-avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; letter-spacing: 1px; }

                @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div >
    );
}
