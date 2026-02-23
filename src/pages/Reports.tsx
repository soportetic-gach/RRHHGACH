import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, FileSpreadsheet, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

export default function Reports() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [campuses, setCampuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCampus, setSelectedCampus] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch campuses for the filter
            const { data: campusData } = await supabase.from('campuses').select('id, name').order('name');
            if (campusData) setCampuses(campusData);

            // Fetch employees with related data
            const { data: empData, error } = await supabase
                .from('employees')
                .select(`
                    id,
                    identification,
                    first_name,
                    last_name,
                    personal_email,
                    hire_date,
                    vacation_days_available,
                    is_active,
                    campuses(name),
                    positions(name)
                `)
                .order('first_name');

            if (error) throw error;
            setEmployees(empData || []);

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Error al cargar la información para el reporte');
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.identification.includes(searchTerm);

        const matchesCampus = selectedCampus === '' || emp.campuses?.name === selectedCampus;

        return matchesSearch && matchesCampus;
    });

    const handleExportExcel = () => {
        if (filteredEmployees.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }

        const dataToExport = filteredEmployees.map(emp => ({
            'Cédula / Identificación': emp.identification,
            'Nombre Completo': `${emp.first_name} ${emp.last_name}`,
            'Sede / Campus': emp.campuses?.name || 'No Asignada',
            'Puesto de Trabajo': emp.positions?.name || 'No Asignado',
            'Correo Personal': emp.personal_email || 'No especificado',
            'Fecha de Ingreso': emp.hire_date,
            'Saldo de Vacaciones': emp.vacation_days_available,
            'Estado': emp.is_active !== false ? 'Activo' : 'Inactivo'
        }));

        // Convert to CSV using Papaparse
        const csv = Papa.unparse(dataToExport);

        // Add BOM so Excel reads UTF-8 correctly
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);

        const date = new Date().toISOString().split('T')[0];
        link.setAttribute("download", `Reporte_General_Empleados_${date}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Reporte descargado correctamente');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Reportes del Sistema</h1>
                    <p>Módulo de reportería general e indicadores</p>
                </div>
            </div>

            <div className="card">
                <div style={{ padding: '0 0 1.5rem 0', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <FileSpreadsheet size={20} />
                        Reporte General de Empleados
                    </h2>
                    <button className="btn btn-primary" onClick={handleExportExcel} disabled={loading || filteredEmployees.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={18} />
                        <span>Descargar Excel (CSV)</span>
                    </button>
                </div>

                <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div className="search-box" style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '2.5rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '250px' }}>
                        <Building size={18} color="var(--text-secondary)" />
                        <select
                            className="form-select"
                            style={{ flex: 1 }}
                            value={selectedCampus}
                            onChange={(e) => setSelectedCampus(e.target.value)}
                        >
                            <option value="">Todas las Sedes (General)</option>
                            {campuses.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando datos del reporte...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Cédula</th>
                                    <th>Nombre Completo</th>
                                    <th>Sede</th>
                                    <th>Puesto</th>
                                    <th>Correo Personal</th>
                                    <th>F. Ingreso</th>
                                    <th>Saldo Vac.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={{ fontWeight: 500 }}>{emp.identification}</td>
                                            <td>{emp.first_name} {emp.last_name}</td>
                                            <td>
                                                <span style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    {emp.campuses?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td>{emp.positions?.name || 'N/A'}</td>
                                            <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{emp.personal_email || '-'}</td>
                                            <td>{emp.hire_date}</td>
                                            <td>
                                                <span className={`badge ${emp.vacation_days_available > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '1rem', padding: '0.25rem 0.5rem' }}>
                                                    {emp.vacation_days_available}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                            <FileSpreadsheet size={32} style={{ margin: '0 auto 0.5rem', color: '#cbd5e1' }} />
                                            <p>No hay registros que coincidan con la búsqueda</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        Total de registros mostrados: <strong>{filteredEmployees.length}</strong>
                    </div>
                </div>
            </div>

            <style>{`
                .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
                .page-header { display: flex; justify-content: space-between; align-items: center; }
                .page-header h1 { font-size: 1.5rem; color: var(--text-primary); }
                .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
            `}</style>
        </div>
    );
}
