import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, KeyRound, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

export default function Login() {
  const { settings } = useSettings();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, get the email associated with the identifier if the user inserts identification
      // In this demo, if the identifier has '@', we treat it as email directly
      let loginEmail = identifier;

      if (!identifier.includes('@')) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('email')
          .eq('identification', identifier)
          .single();

        if (employeeError || !employeeData) {
          throw new Error('Identificación no encontrada');
        }
        loginEmail = employeeData.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) throw error;
      toast.success('Bienvenido al Sistema');

    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {settings.login_logo_url && (
        <div
          className="login-background"
          style={{ backgroundImage: `url(${settings.login_logo_url})` }}
        />
      )}
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle" style={{ background: settings.login_logo_url ? 'transparent' : 'var(--info-bg)' }}>
            {settings.login_logo_url ? (
              <img src={settings.login_logo_url} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <Building2 size={36} className="logo-icon" />
            )}
          </div>
          <h1>{settings.company_name}</h1>
          <p>Portal de Empleados y Administración</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Identificación o Correo</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="form-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ingresa tu ID o correo"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-with-icon">
              <KeyRound size={18} className="input-icon" />
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--bg-color) 0%, #cbd5e1 100%);
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.08;
          filter: blur(12px);
          z-index: 0;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          padding: 2.5rem;
          border-top: 4px solid var(--primary-color);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-circle {
          width: 72px;
          height: 72px;
          background-color: var(--info-bg);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          color: var(--primary-color);
          box-shadow: 0 0 15px rgba(30, 58, 138, 0.2);
        }

        .login-header h1 {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .login-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
        }

        .input-with-icon .form-input {
          width: 100%;
          padding-left: 2.75rem;
          height: 44px;
        }

        .login-btn {
          width: 100%;
          height: 44px;
          margin-top: 1rem;
          font-size: 1rem;
          box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.3);
        }
      `}</style>
    </div>
  );
}
