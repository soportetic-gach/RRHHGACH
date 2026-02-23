import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pchxtolgplmsrspsqcto.supabase.co';
// Need the service_role key to bypass RLS and create users on the backend directly.
// But wait, auth.signUp works from anon key if we just want to create a standard user!
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHh0b2xncGxtc3JzcHNxY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTcxNDYsImV4cCI6MjA4NzQzMzE0Nn0.IUaNcszTqiN7peYt1vFWspz_h0oQuNiQlRZzGRBwp-Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
    console.log('Creando usuario administrador...');

    // 1. SignUp user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'admin@empresa.com',
        password: 'password123',
    });

    if (authError) {
        console.error('Error creando usuario Auth:', authError.message);
        return;
    }

    const userId = authData.user?.id;
    console.log('Usuario Auth Creado con ID:', userId);

    // 2. Add as Employee to satisfy foreign keys
    const { error: empError } = await supabase.from('employees').insert({
        id: userId,
        identification: 'ADM-001',
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@empresa.com',
        phone: '555-0000',
        hire_date: new Date().toISOString().split('T')[0],
        employee_status: 'ACTIVO',
        vacation_days_available: 15
    });

    if (empError) {
        console.error('Error creando perfil de Empleado:', empError.message);
        return;
    }

    // 3. Assign ADMIN_TI role
    const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: 1 // 1 is ADMIN_TI
    });

    if (roleError) {
        console.error('Error asignando rol:', roleError.message);
        return;
    }

    console.log('¡Administrador creado con éxito!');
}

createAdmin();
