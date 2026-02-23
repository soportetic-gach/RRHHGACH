import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Upload, Save, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

export default function SiteEditor() {
    const { settings, refreshSettings } = useSettings();
    const [formData, setFormData] = useState({
        company_name: '',
        primary_color: '',
        secondary_color: '',
        logo_url: '',
        login_logo_url: ''
    });
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);

    useEffect(() => {
        setFormData({
            company_name: settings.company_name,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            logo_url: settings.logo_url,
            login_logo_url: settings.login_logo_url
        });
    }, [settings]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'login_logo_url') => {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            const file = event.target.files[0];

            field === 'logo_url' ? setUploadingLogo(true) : setUploadingLoginLogo(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${field}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('system_assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('system_assets').getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
            toast.success('Imagen cargada correctamente');
        } catch (error: any) {
            toast.error(error.message || 'Error al subir la imagen');
        } finally {
            field === 'logo_url' ? setUploadingLogo(false) : setUploadingLoginLogo(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await supabase
                .from('site_settings')
                .update(formData)
                .eq('id', 1);

            if (error) throw error;

            toast.success('Configuración guardada correctamente');
            await refreshSettings();
        } catch (error: any) {
            toast.error('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings className="text-primary-color" size={28} />
                        Editor del Sitio
                    </h1>
                    <p>Personaliza la apariencia y marca de Enterprise HR</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="section-title" style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Textos Relevantes</div>

                    <div className="form-group">
                        <label className="form-label">Nombre de la Empresa / Sistema</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            placeholder="Ej. Sistema HR Enterprise"
                            required
                        />
                    </div>

                    <div className="section-title" style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '1rem' }}>Colores del Tema</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">Color Principal</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={formData.primary_color}
                                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                    style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.primary_color}
                                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Color Secundario (Footer/Hover)</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={formData.secondary_color}
                                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                    style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.secondary_color}
                                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="section-title" style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '1rem' }}>Logotipos</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                        {/* Sidebar Logo */}
                        <div className="form-group">
                            <label className="form-label">Logo Barra Lateral (Sidebar)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Sidebar Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                                ) : (
                                    <Building2 size={40} color="#94a3b8" />
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="sidebar-logo"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleUpload(e, 'logo_url')}
                                        disabled={uploadingLogo}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => document.getElementById('sidebar-logo')?.click()}
                                        disabled={uploadingLogo}
                                    >
                                        <Upload size={18} />
                                        {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo Lateral'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Login Logo */}
                        <div className="form-group">
                            <label className="form-label">Logo Pantalla de Login</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                                {formData.login_logo_url ? (
                                    <img src={formData.login_logo_url} alt="Login Logo" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ width: '80px', height: '80px', background: 'var(--primary-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 color="white" size={40} />
                                    </div>
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="login-logo"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleUpload(e, 'login_logo_url')}
                                        disabled={uploadingLoginLogo}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => document.getElementById('login-logo')?.click()}
                                        disabled={uploadingLoginLogo}
                                    >
                                        <Upload size={18} />
                                        {uploadingLoginLogo ? 'Subiendo...' : 'Cambiar Logo Login'}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem' }}>
                            <Save size={20} />
                            {loading ? 'Guardando...' : 'Aplicar Cambios'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
                .page-header { display: flex; justify-content: space-between; align-items: center; }
                .page-header h1 { font-size: 1.5rem; color: var(--text-primary); margin: 0; }
                .page-header p { color: var(--text-secondary); margin-top: 0.25rem; }
                .text-primary-color { color: var(--primary-color); }
            `}</style>
        </div>
    );
}
