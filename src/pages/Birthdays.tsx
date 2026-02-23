import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Birthdays() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

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
                .eq('employee_status', 'ACTIVO')
                .not('birth_date', 'is', null);

            if (error) throw error;

            // Filter for current month
            const currentMonth = new Date().getMonth();
            const birthdayEmployees = (data || []).filter(emp => {
                if (!emp.birth_date) return false;
                const parts = emp.birth_date.split('-');
                if (parts.length === 3) {
                    const monthZeroIndexed = parseInt(parts[1], 10) - 1;
                    return monthZeroIndexed === currentMonth;
                }
                return false;
            }).sort((a, b) => {
                const dayA = parseInt(a.birth_date.split('-')[2], 10);
                const dayB = parseInt(b.birth_date.split('-')[2], 10);
                return dayA - dayB;
            });

            setEmployees(birthdayEmployees);
        } catch (error: any) {
            toast.error('Error al cargar cumpleaños');
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getMonthName = () => {
        const date = new Date();
        const month = date.toLocaleString('es-ES', { month: 'long' });
        return month.charAt(0).toUpperCase() + month.slice(1);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Gift className="text-primary-color" size={28} />
                        Cumpleaños del Mes
                    </h1>
                    <p>Celebramos los cumpleaños de {getMonthName()}</p>
                </div>
            </div>

            <div className="card">
                <div className="filters-bar" style={{ marginBottom: '1.5rem' }}>
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar cumpleañero..."
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
                                    <th>Fecha de Cumpleaños</th>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th>Puesto</th>
                                    <th>Sede Fija</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => {
                                        const parts = emp.birth_date.split('-');
                                        const day = parts[2];
                                        const month = new Date(2000, parseInt(parts[1]) - 1, 1).toLocaleString('es-ES', { month: 'long' });

                                        return (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                                        <Gift size={18} className="text-primary-color" />
                                                        {day} de {month}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="emp-info-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {emp.photo_url ? (
                                                            <img src={emp.photo_url} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                        ) : (
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.85rem' }}>
                                                                {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {emp.identification}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{emp.departments?.name || 'N/A'}</td>
                                                <td>{emp.positions?.name || 'N/A'}</td>
                                                <td>{emp.campuses?.name || 'N/A'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '50%', display: 'inline-flex' }}>
                                                    <Gift size={48} color="#94a3b8" />
                                                </div>
                                                <p style={{ fontSize: '1.1rem', margin: 0 }}>No hay cumpleaños registrados para este mes</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style>{`
        .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .page-header h1 { font-size: 1.5rem; color: var(--text-primary); margin: 0; }
        .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
        .text-primary-color { color: var(--primary-color); }
        .filters-bar { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .search-box { position: relative; flex: 1; min-width: 300px; max-width: 500px; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
        .search-input { width: 100%; padding-left: 2.5rem; }
        .loading-state { padding: 3rem; text-align: center; color: var(--text-secondary); }
      `}</style>
        </div>
    );
}
