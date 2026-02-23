import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Building, MapPin, Briefcase, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

type CatalogType = 'departments' | 'positions' | 'campuses' | 'leave_types';

interface CatalogItem {
    id: string;
    name: string;
    location?: string; // Only for campuses
    department_id?: string; // Only for positions
    consumes_vacation?: boolean; // Only for leave_types
    departments?: { name: string }; // For join display
}

export default function Catalogs() {
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState<CatalogType>('departments');
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [formData, setFormData] = useState({ name: '', location: '', department_id: '', consumes_vacation: false });
    const [saving, setSaving] = useState(false);

    // Departments for dropdowns when in 'positions' tab
    const [departmentsList, setDepartmentsList] = useState<CatalogItem[]>([]);

    useEffect(() => {
        fetchItems();
        if (activeTab === 'positions') {
            fetchDepartmentsList();
        }
    }, [activeTab]);

    const fetchDepartmentsList = async () => {
        const { data } = await supabase.from('departments').select('id, name').order('name');
        if (data) setDepartmentsList(data);
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            let query = supabase.from(activeTab).select('*').order('name');
            if (activeTab === 'positions') {
                query = supabase.from('positions').select('*, departments(name)').order('name');
            }
            const { data, error } = await query;

            if (error) throw error;
            setItems(data || []);
        } catch (error: any) {
            toast.error(`Error al cargar ${getTabTitle()}`);
        } finally {
            setLoading(false);
        }
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'departments': return 'Departamentos';
            case 'positions': return 'Puestos';
            case 'campuses': return 'Sedes';
            case 'leave_types': return 'Tipos de Permiso';
        }
    };

    const openModal = (item?: CatalogItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, location: item.location || '', department_id: item.department_id || '', consumes_vacation: item.consumes_vacation || false });
        } else {
            setEditingItem(null);
            setFormData({ name: '', location: '', department_id: departmentsList[0]?.id || '', consumes_vacation: false });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ name: '', location: '', department_id: '', consumes_vacation: false });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        try {
            setSaving(true);
            const payload: any = { name: formData.name.trim() };
            if (activeTab === 'campuses') {
                if (!formData.location.trim()) {
                    toast.error('La ubicación es requerida para las sedes');
                    setSaving(false);
                    return;
                }
                payload.location = formData.location.trim();
            } else if (activeTab === 'positions') {
                if (!formData.department_id) {
                    toast.error('El departamento es requerido');
                    setSaving(false);
                    return;
                }
                payload.department_id = formData.department_id;
            } else if (activeTab === 'leave_types') {
                payload.consumes_vacation = formData.consumes_vacation;
            }

            if (editingItem) {
                const { error } = await supabase
                    .from(activeTab)
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
                toast.success('Actualizado correctamente');
            } else {
                const { error } = await supabase
                    .from(activeTab)
                    .insert([payload]);
                if (error) throw error;
                toast.success('Creado correctamente');
            }

            closeModal();
            fetchItems();
        } catch (error: any) {
            toast.error('Ocurrió un error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

        try {
            const { error } = await supabase
                .from(activeTab)
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Eliminado correctamente');
            fetchItems();
        } catch (error: any) {
            toast.error('No se puede eliminar, es posible que esté en uso');
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (role !== 'ADMIN_TI') {
        return <div className="page-container"><h2>Acceso Denegado</h2></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Catálogos del Sistema</h1>
                    <p>Gestiona departamentos, puestos y sedes de la empresa</p>
                </div>
            </div>

            <div className="card">
                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('departments')}
                    >
                        <Building size={18} />
                        Departamentos
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('positions')}
                    >
                        <Briefcase size={18} />
                        Puestos
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'campuses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('campuses')}
                    >
                        <MapPin size={18} />
                        Sedes
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'leave_types' ? 'active' : ''}`}
                        onClick={() => setActiveTab('leave_types')}
                    >
                        <Calendar size={18} />
                        Permisos y Ausencias
                    </button>
                </div>

                <div className="filters-bar" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder={`Buscar en ${getTabTitle().toLowerCase()}...`}
                            className="form-input search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        <span>Nuevo Registro</span>
                    </button>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="loading-state">Cargando datos...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    {activeTab === 'campuses' && <th>Ubicación</th>}
                                    {activeTab === 'positions' && <th>Departamento</th>}
                                    {activeTab === 'leave_types' && <th>Resta de Vacaciones</th>}
                                    <th style={{ width: '120px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length > 0 ? (
                                    filteredItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: '500' }}>{item.name}</td>
                                            {activeTab === 'campuses' && <td>{item.location}</td>}
                                            {activeTab === 'positions' && <td>{item.departments?.name || <span style={{ color: '#94a3b8' }}>- Sin Asignar -</span>}</td>}
                                            {activeTab === 'leave_types' && <td>{item.consumes_vacation ? <span className="badge badge-danger">Sí (Descuenta)</span> : <span className="badge badge-success">No (No descuenta)</span>}</td>}
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-icon" title="Editar" onClick={() => openModal(item)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="btn-icon btn-icon-danger" title="Eliminar" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={activeTab === 'campuses' ? 3 : 2} className="empty-state">
                                            <p>No se encontraron registros en {getTabTitle().toLowerCase()}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>{editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'departments' ? 'Departamento' : activeTab === 'positions' ? 'Puesto' : activeTab === 'leave_types' ? 'Tipo de Permiso' : 'Sede'}</h2>
                            <button className="modal-close" onClick={closeModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nombre</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Recursos Humanos"
                                    required
                                />
                            </div>

                            {activeTab === 'campuses' && (
                                <div className="form-group">
                                    <label className="form-label">Ubicación</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Ej. San José Centro"
                                        required
                                    />
                                </div>
                            )}

                            {activeTab === 'positions' && (
                                <div className="form-group">
                                    <label className="form-label">Departamento al que pertenece</label>
                                    <select
                                        className="form-select"
                                        value={formData.department_id}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecciona un departamento...</option>
                                        {departmentsList.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {activeTab === 'leave_types' && (
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        id="consumes_vacation"
                                        checked={formData.consumes_vacation}
                                        onChange={(e) => setFormData({ ...formData, consumes_vacation: e.target.checked })}
                                        style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="consumes_vacation" style={{ cursor: 'pointer', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
                                        Este tipo de permiso/ausencia descuenta días del saldo de vacaciones
                                    </label>
                                </div>
                            )}

                            <div className="modal-footer" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={closeModal} style={{ background: '#e2e8f0', color: '#475569' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Datos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .tabs-container {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          gap: 1rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .btn-icon-danger {
          color: #ef4444;
        }

        .btn-icon-danger:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          width: 90%;
          box-shadow: var(--shadow-xl);
          animation: slideIn 0.3s ease-out;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .modal-close {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
}
