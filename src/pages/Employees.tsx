import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, ShieldAlert, X, Camera, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

export default function Employees() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Catalogs
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [campuses, setCampuses] = useState<any[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkResults, setBulkResults] = useState<{ total: number; inserted: number; skipped: number; errors: any[] } | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [formData, setFormData] = useState({
        identification: '',
        first_name: '',
        last_name: '',
        email: '',
        personal_email: '',
        phone: '',
        personal_phone: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        department_id: '',
        position_id: '',
        campus_id: '',
        current_salary: '',
        hire_date: new Date().toISOString().split('T')[0],
        birth_date: '',
        photo_url: '',
    });

    useEffect(() => {
        fetchEmployees();
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const [deptRes, posRes, campRes] = await Promise.all([
                supabase.from('departments').select('*'),
                supabase.from('positions').select('*'),
                supabase.from('campuses').select('*')
            ]);
            setDepartments(deptRes.data || []);
            setPositions(posRes.data || []);
            setCampuses(campRes.data || []);
        } catch (error) {
            console.error('Error fetching catalogs');
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select(`
          *,
          departments (name),
          positions (name),
          campuses (name)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (error: any) {
            toast.error('Error al cargar empleados');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (emp?: any) => {
        if (departments.length === 0 || positions.length === 0 || campuses.length === 0) {
            toast.error('Por favor registre al menos un departamento, puesto y sede primero');
            return;
        }

        if (emp && emp.id) {
            setEditingEmployee(emp);
            setPhotoFile(null);
            setPhotoPreview(emp.photo_url || '');
            setFormData({
                identification: emp.identification || '',
                first_name: emp.first_name || '',
                last_name: emp.last_name || '',
                email: emp.email || '',
                personal_email: emp.personal_email || '',
                phone: emp.phone || '',
                personal_phone: emp.personal_phone || '',
                address: emp.address || '',
                emergency_contact_name: emp.emergency_contact_name || '',
                emergency_contact_phone: emp.emergency_contact_phone || '',
                department_id: emp.department_id || departments[0]?.id || '',
                position_id: emp.position_id || positions[0]?.id || '',
                campus_id: emp.campus_id || campuses[0]?.id || '',
                current_salary: emp.current_salary?.toString() || '',
                hire_date: emp.hire_date || new Date().toISOString().split('T')[0],
                birth_date: emp.birth_date || '',
                photo_url: emp.photo_url || '',
            });
        } else {
            setEditingEmployee(null);
            setPhotoFile(null);
            setPhotoPreview('');
            const firstDeptId = departments[0]?.id || '';
            const validPositions = positions.filter(p => p.department_id === firstDeptId);

            setFormData({
                identification: '',
                first_name: '',
                last_name: '',
                email: '',
                personal_email: '',
                phone: '',
                personal_phone: '',
                address: '',
                emergency_contact_name: '',
                emergency_contact_phone: '',
                department_id: firstDeptId,
                position_id: validPositions[0]?.id || positions[0]?.id || '',
                campus_id: campuses[0]?.id || '',
                current_salary: '',
                hire_date: new Date().toISOString().split('T')[0],
                birth_date: '',
                photo_url: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            // Validate unique inputs locally mostly handled by DB
            const salary = parseFloat(formData.current_salary);
            if (salary < 0) {
                toast.error('El salario no puede ser negativo');
                return;
            }

            let finalPhotoUrl = formData.photo_url;
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop() || 'jpg';
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('employee_photos')
                    .upload(fileName, photoFile);

                if (uploadError) {
                    toast.error('Ocurrió un error al subir la foto');
                    setSaving(false);
                    return;
                }

                const { data } = supabase.storage
                    .from('employee_photos')
                    .getPublicUrl(fileName);

                finalPhotoUrl = data.publicUrl;
            }

            if (editingEmployee) {
                const { error } = await supabase.from('employees').update({
                    identification: formData.identification.trim(),
                    first_name: formData.first_name.trim(),
                    last_name: formData.last_name.trim(),
                    email: formData.email.trim(),
                    personal_email: formData.personal_email.trim(),
                    phone: formData.phone.trim(),
                    personal_phone: formData.personal_phone.trim(),
                    address: formData.address.trim(),
                    emergency_contact_name: formData.emergency_contact_name.trim(),
                    emergency_contact_phone: formData.emergency_contact_phone.trim(),
                    department_id: formData.department_id,
                    position_id: formData.position_id,
                    campus_id: formData.campus_id,
                    current_salary: salary,
                    hire_date: formData.hire_date,
                    birth_date: formData.birth_date || null,
                    photo_url: finalPhotoUrl,
                }).eq('id', editingEmployee.id);

                if (error) throw error;
                toast.success('Expediente actualizado exitosamente');
            } else {
                // Call internal RPC stored secure function for creation
                const { error } = await supabase.rpc('register_employee', {
                    p_identification: formData.identification.trim(),
                    p_first_name: formData.first_name.trim(),
                    p_last_name: formData.last_name.trim(),
                    p_business_email: formData.email.trim(),
                    p_personal_email: formData.personal_email.trim(),
                    p_business_phone: formData.phone.trim(),
                    p_personal_phone: formData.personal_phone.trim(),
                    p_address: formData.address.trim(),
                    p_emergency_contact_name: formData.emergency_contact_name.trim(),
                    p_emergency_contact_phone: formData.emergency_contact_phone.trim(),
                    p_department_id: formData.department_id,
                    p_position_id: formData.position_id,
                    p_campus_id: formData.campus_id,
                    p_current_salary: salary,
                    p_hire_date: formData.hire_date,
                    p_birth_date: formData.birth_date || null,
                    p_photo_url: finalPhotoUrl || '',
                });

                if (error) throw error;
                toast.success('Empleado registrado exitosamente');
            }

            setIsModalOpen(false);
            fetchEmployees();
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('identification')) toast.error('La identificación ya existe');
            else if (error.message?.includes('email')) toast.error('El correo ya está registrado');
            else toast.error('Ocurrió un error al registrar al empleado');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.identification.includes(searchTerm)
    );

    // Dynamic positions based on selected department
    const availablePositionsForForm = formData.department_id
        ? positions.filter(p => p.department_id === formData.department_id)
        : positions;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Gestión de Empleados</h1>
                    <p>Administra la información corporativa del personal</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn" onClick={() => setIsBulkModalOpen(true)} style={{ background: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}>
                        <Upload size={18} />
                        <span>Carga Masiva (CSV)</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        <span>Nuevo Empleado</span>
                    </button>
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
                    <div className="filter-selects">
                        <select className="form-select">
                            <option value="">Todos los Departamentos</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="loading-state">Cargando...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Identificación</th>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th>Puesto</th>
                                    <th>Sede</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>{emp.identification}</td>
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
                                            <td>{emp.departments?.name || 'N/A'}</td>
                                            <td>{emp.positions?.name || 'N/A'}</td>
                                            <td>{emp.campuses?.name || 'N/A'}</td>
                                            <td>
                                                <span className={`badge ${emp.employee_status === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                                                    {emp.employee_status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-icon" title="Editar Expediente" onClick={() => openModal(emp)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="empty-state">
                                            <ShieldAlert size={32} />
                                            <p>No se encontraron empleados</p>
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
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingEmployee ? 'Editar Expediente de Colaborador' : 'Registrar Nuevo Colaborador'}</h2>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-body form-grid">
                            <div className="profile-photo-section">
                                <label htmlFor="photo-upload" className="photo-upload-circle">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Profile Preview" className="profile-preview" />
                                    ) : (
                                        <div className="photo-placeholder">
                                            <Camera size={32} />
                                            <span>Subir Foto</span>
                                        </div>
                                    )}
                                </label>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden-input"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setPhotoFile(file);
                                            setPhotoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>

                            <div className="section-title">Información Básica</div>

                            <div className="form-group">
                                <label className="form-label">Identificación (Usuario)</label>
                                <input type="text" className="form-input" required
                                    value={formData.identification}
                                    onChange={(e) => setFormData({ ...formData, identification: e.target.value })} />
                            </div>

                            <div className="form-group empty-group" style={{ visibility: 'hidden' }}></div>

                            <div className="form-group">
                                <label className="form-label">Nombre</label>
                                <input type="text" className="form-input" required
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Apellidos</label>
                                <input type="text" className="form-input" required
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Fecha de Nacimiento</label>
                                <input type="date" className="form-input" required
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                            </div>

                            <div className="section-title">Contacto y Residencia</div>

                            <div className="form-group">
                                <label className="form-label">Teléfono Empresarial</label>
                                <input type="text" className="form-input" required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Teléfono Personal</label>
                                <input type="text" className="form-input"
                                    value={formData.personal_phone}
                                    onChange={(e) => setFormData({ ...formData, personal_phone: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Correo Empresarial <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>(Usado para Login)</span></label>
                                <input type="email" className="form-input" required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Correo Personal</label>
                                <input type="email" className="form-input"
                                    value={formData.personal_email}
                                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })} />
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Dirección Exacta (Lugar de residencia)</label>
                                <textarea className="form-input" style={{ minHeight: '60px', resize: 'vertical' }}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}></textarea>
                            </div>

                            <div className="section-title">Contacto de Emergencia Externo</div>

                            <div className="form-group">
                                <label className="form-label">Nombre Completo del Contacto</label>
                                <input type="text" className="form-input"
                                    value={formData.emergency_contact_name}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Teléfono del Contacto</label>
                                <input type="text" className="form-input"
                                    value={formData.emergency_contact_phone}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} />
                            </div>

                            <div className="section-title">Datos Laborales y Corporativos</div>

                            <div className="form-group">
                                <label className="form-label">Salario Base</label>
                                <input type="number" step="0.01" className="form-input" required
                                    value={formData.current_salary}
                                    onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Fecha de Ingreso</label>
                                <input type="date" className="form-input" required
                                    value={formData.hire_date}
                                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Departamento</label>
                                <select className="form-select" required
                                    value={formData.department_id}
                                    onChange={(e) => {
                                        const newDeptId = e.target.value;
                                        const newValidPositions = positions.filter(p => p.department_id === newDeptId);
                                        setFormData({
                                            ...formData,
                                            department_id: newDeptId,
                                            // Auto-select first available position for this department
                                            position_id: newValidPositions.length > 0 ? newValidPositions[0].id : ''
                                        });
                                    }}>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Puesto</label>
                                <select className="form-select" required
                                    value={formData.position_id}
                                    onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                    disabled={availablePositionsForForm.length === 0}
                                >
                                    {availablePositionsForForm.length > 0 ? (
                                        availablePositionsForForm.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                    ) : (
                                        <option value="">No hay puestos en este departamento</option>
                                    )}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sede Fija</label>
                                <select className="form-select" required
                                    value={formData.campus_id}
                                    onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}>
                                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="modal-footer" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                {!editingEmployee && (
                                    <p className="helper-text" style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                        * El sistema creará automáticamente un usuario y asignará una contraseña temporal basada en la identificación.
                                    </p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Procesando...' : (editingEmployee ? 'Guardar Cambios' : 'Completar Registro')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBulkModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Carga Masiva de Empleados (CSV)</h2>
                            <button className="modal-close" onClick={() => setIsBulkModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {!bulkResults ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <p style={{ color: 'var(--text-secondary)' }}>Instrucciones: Descarga la plantilla CSV, complétala con los datos de los nuevos empleados (evita modificar las cabeceras) y luego sube el archivo modificado aquí. El sistema validará registros existentes por Número de Identificación o Correo Empresarial y los ignorará para evitar duplicados.</p>

                                    <button
                                        className="btn"
                                        style={{ alignSelf: 'flex-start', background: '#f1f5f9', color: 'var(--primary-color)', fontWeight: 600, border: 'none' }}
                                        onClick={() => {
                                            const headers = ['Identificacion', 'Nombre', 'Apellidos', 'Correo Empresarial', 'Correo Personal', 'Telefono Empresarial', 'Telefono Personal', 'Direccion', 'Contacto Emergencia Nombre', 'Contacto Emergencia Telefono', 'Salario Base', 'Fecha Ingreso (YYYY-MM-DD)', 'Departamento (Nombre Exacto)', 'Puesto (Nombre Exacto)', 'Sede Fija (Nombre Exacto)', 'Vacaciones Disponibles'];
                                            const csv = Papa.unparse([headers]);
                                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement("a");
                                            link.setAttribute("href", url);
                                            link.setAttribute("download", "plantilla_empleados.csv");
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                    >
                                        <Download size={18} /> Descargar Plantilla CSV
                                    </button>

                                    <div style={{ border: '2px dashed #cbd5e1', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginTop: '1rem', background: '#f8fafc' }}>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            id="csv-upload"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                setSaving(true);
                                                Papa.parse(file, {
                                                    header: true,
                                                    skipEmptyLines: true,
                                                    complete: async (results) => {
                                                        const rows: any[] = results.data;
                                                        let inserted = 0;
                                                        let skipped = 0;
                                                        const errors = [];

                                                        for (const row of rows) {
                                                            try {
                                                                const ident = row['Identificacion']?.trim();
                                                                const email = row['Correo Empresarial']?.trim();
                                                                const name = row['Nombre']?.trim();

                                                                if (!ident || !email || !name) {
                                                                    skipped++;
                                                                    continue; // Skip invalid fundamental empty rows
                                                                }

                                                                // Check if exists
                                                                const { data: existing } = await supabase
                                                                    .from('employees')
                                                                    .select('id')
                                                                    .or(`identification.eq."${ident}",email.eq."${email}"`);

                                                                if (existing && existing.length > 0) {
                                                                    skipped++;
                                                                    continue;
                                                                }

                                                                // Find IDs for department, position, campus
                                                                const dName = row['Departamento (Nombre Exacto)']?.trim();
                                                                const pName = row['Puesto (Nombre Exacto)']?.trim();
                                                                const cName = row['Sede Fija (Nombre Exacto)']?.trim();

                                                                const dId = departments.find(d => d.name === dName)?.id || departments[0]?.id;
                                                                const pId = positions.find(p => p.name === pName)?.id || positions[0]?.id;
                                                                const cId = campuses.find(c => c.name === cName)?.id || campuses[0]?.id;

                                                                const { data: newEmployeeId, error } = await supabase.rpc('register_employee', {
                                                                    p_identification: ident,
                                                                    p_first_name: name,
                                                                    p_last_name: row['Apellidos']?.trim() || '',
                                                                    p_business_email: email,
                                                                    p_personal_email: row['Correo Personal']?.trim() || '',
                                                                    p_business_phone: row['Telefono Empresarial']?.trim() || '',
                                                                    p_personal_phone: row['Telefono Personal']?.trim() || '',
                                                                    p_address: row['Direccion']?.trim() || '',
                                                                    p_emergency_contact_name: row['Contacto Emergencia Nombre']?.trim() || '',
                                                                    p_emergency_contact_phone: row['Contacto Emergencia Telefono']?.trim() || '',
                                                                    p_department_id: dId,
                                                                    p_position_id: pId,
                                                                    p_campus_id: cId,
                                                                    p_current_salary: parseFloat(row['Salario Base']) || 0,
                                                                    p_hire_date: row['Fecha Ingreso (YYYY-MM-DD)']?.trim() || new Date().toISOString().split('T')[0],
                                                                    p_photo_url: '',
                                                                });

                                                                if (error) {
                                                                    console.error(error);
                                                                    skipped++;
                                                                    errors.push({ ident, error: error.message });
                                                                } else {
                                                                    const vacDays = parseFloat(row['Vacaciones Disponibles']) || 0;
                                                                    if (vacDays > 0 && newEmployeeId) {
                                                                        await supabase.from('employees').update({ vacation_days_available: vacDays }).eq('id', newEmployeeId);
                                                                    }
                                                                    inserted++;
                                                                }
                                                            } catch (err: any) {
                                                                skipped++;
                                                                errors.push({ row: row['Identificacion'], error: err.message });
                                                            }
                                                        }

                                                        setBulkResults({
                                                            total: rows.length,
                                                            inserted,
                                                            skipped,
                                                            errors
                                                        });
                                                        setSaving(false);
                                                        fetchEmployees();
                                                        toast.success('Proceso de carga masiva finalizado');
                                                    },
                                                    error: (error) => {
                                                        toast.error('Error al parsear el archivo CSV: ' + error.message);
                                                        setSaving(false);
                                                    }
                                                });
                                            }}
                                        />
                                        <label htmlFor="csv-upload" className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {saving ? 'Procesando archivo...' : <><Upload size={20} /> Seleccionar y Cargar Archivo CSV</>}
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                        <ShieldAlert size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Resumen de Carga</h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{bulkResults.total}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filas Analizadas</div>
                                        </div>
                                        <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534' }}>{bulkResults.inserted}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#166534' }}>Registrados Nuevos</div>
                                        </div>
                                        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>{bulkResults.skipped}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#92400e' }}>Omitidos (Ya existen o Error)</div>
                                        </div>
                                    </div>

                                    {bulkResults.errors.length > 0 && (
                                        <div style={{ textAlign: 'left', background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>Detalle de errores:</p>
                                            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#991b1b', maxHeight: '100px', overflowY: 'auto' }}>
                                                {bulkResults.errors.map((e, idx) => (
                                                    <li key={idx}>ID {e.ident || e.row}: {e.error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => { setIsBulkModalOpen(false); setBulkResults(null); }}>
                                        Cerrar y Ver Empleados
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .page-header h1 { font-size: 1.5rem; color: var(--text-primary); }
        .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
        .filters-bar { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .search-box { position: relative; flex: 1; min-width: 300px; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
        .search-input { width: 100%; padding-left: 2.5rem; }
        .filter-selects { display: flex; gap: 1rem; }
        .emp-name { font-weight: 500; color: var(--text-primary); }
        .emp-email { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem; }
        .action-buttons { display: flex; gap: 0.5rem; }
        .btn-icon { padding: 0.375rem; background: #f1f5f9; border-radius: var(--radius-sm); color: var(--text-secondary); transition: all 0.2s; border: none; cursor: pointer; }
        .btn-icon:hover { background: #e2e8f0; color: var(--text-primary); }
        .empty-state { text-align: center; padding: 3rem 1rem !important; color: var(--text-secondary); }
        .empty-state svg { margin-bottom: 0.75rem; color: #94a3b8; }
        .loading-state { padding: 3rem; text-align: center; color: var(--text-secondary); }
        
        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: var(--surface-color); border-radius: var(--radius-lg); width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slideIn 0.3s ease-out; }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-header h2 { font-size: 1.25rem; margin: 0; color: var(--text-primary); }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.25rem; display: flex; }
        .modal-close:hover { color: var(--text-primary); }
        .modal-body { padding: 1.5rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .section-title { grid-column: 1 / -1; font-weight: 600; color: var(--primary-color); border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1.1rem; }
        .photo-upload-circle { width: 120px; height: 120px; border-radius: 50%; background: #f1f5f9; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; position: relative; transition: all 0.2s; margin: 0 auto; box-shadow: var(--shadow-sm); }
        .photo-upload-circle:hover { border-color: var(--primary-color); background: #e2e8f0; }
        .photo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #94a3b8; }
        .photo-placeholder span { font-size: 0.75rem; font-weight: 500; }
        .profile-preview { width: 100%; height: 100%; object-fit: cover; }
        .hidden-input { display: none; }
        .profile-photo-section { grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 0.5rem; margin-bottom: 1rem; }
        .emp-info-wrap { display: flex; align-items: center; gap: 0.75rem; }
        .emp-avatar-small { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0; }
        .emp-avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; letter-spacing: 1px; }
        
        @media (max-width: 768px) { 
            .form-grid { grid-template-columns: 1fr; } 
            .empty-group { display: none; }
        }
        
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}
