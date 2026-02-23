-- Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO roles (name) VALUES ('ADMIN_TI'), ('RRHH'), ('GERENCIA'), ('EMPLEADO');

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campuses
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    identification VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    personal_email VARCHAR(255),
    phone VARCHAR(50),
    personal_phone VARCHAR(50),
    address TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    professional_profile TEXT,
    hire_date DATE NOT NULL,
    employee_status VARCHAR(20) DEFAULT 'ACTIVO' CHECK (employee_status IN ('ACTIVO', 'INACTIVO')),
    current_salary DECIMAL(12,2) CHECK (current_salary >= 0),
    department_id UUID REFERENCES departments(id),
    position_id UUID REFERENCES positions(id),
    campus_id UUID REFERENCES campuses(id),
    vacation_days_available DECIMAL(5,2) DEFAULT 0,
    vacation_days_used DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles
CREATE TABLE user_roles (
    user_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Vacation requests
CREATE TABLE vacation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    hr_approved BOOLEAN DEFAULT FALSE,
    management_approved BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;

-- Helper to check roles
CREATE OR REPLACE FUNCTION user_has_role(role_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de RLS
CREATE POLICY "Public roles are viewable by everyone" ON roles FOR SELECT USING (true);
CREATE POLICY "Departments are viewable by everyone" ON departments FOR SELECT USING (true);
CREATE POLICY "Positions are viewable by everyone" ON positions FOR SELECT USING (true);
CREATE POLICY "Campuses are viewable by everyone" ON campuses FOR SELECT USING (true);

-- Catálogos administrables
CREATE POLICY "Departments manageable by Admin" ON departments FOR ALL USING (user_has_role('ADMIN_TI'));
CREATE POLICY "Positions manageable by Admin" ON positions FOR ALL USING (user_has_role('ADMIN_TI'));
CREATE POLICY "Campuses manageable by Admin" ON campuses FOR ALL USING (user_has_role('ADMIN_TI'));

-- Empleados
CREATE POLICY "Employees viewable by themselves, HR and Admin" ON employees FOR SELECT
    USING (auth.uid() = id OR user_has_role('RRHH') OR user_has_role('ADMIN_TI') OR user_has_role('GERENCIA') OR user_has_role('DIRECTOR_SEDE'));
CREATE POLICY "Employees insertable by Admin and HR" ON employees FOR INSERT
    WITH CHECK (user_has_role('RRHH') OR user_has_role('ADMIN_TI'));
CREATE POLICY "Employees updatable" ON employees FOR UPDATE
    USING (auth.uid() = id OR user_has_role('RRHH') OR user_has_role('ADMIN_TI') OR user_has_role('GERENCIA') OR user_has_role('DIRECTOR_SEDE'));

-- User roles
CREATE POLICY "User roles viewable" ON user_roles FOR SELECT
    USING (auth.uid() = user_id OR user_has_role('RRHH') OR user_has_role('ADMIN_TI') OR user_has_role('GERENCIA'));
CREATE POLICY "User roles manageable" ON user_roles FOR ALL
    USING (user_has_role('ADMIN_TI') OR user_has_role('RRHH'));

-- Solicitudes de vacaciones
CREATE POLICY "Vacations viewable" ON vacation_requests FOR SELECT
    USING (auth.uid() = employee_id OR user_has_role('RRHH') OR user_has_role('GERENCIA') OR user_has_role('ADMIN_TI') OR user_has_role('DIRECTOR_SEDE'));
CREATE POLICY "Vacations insertable" ON vacation_requests FOR INSERT
    WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Vacations updatable" ON vacation_requests FOR UPDATE
    USING (user_has_role('RRHH') OR user_has_role('GERENCIA') OR auth.uid() = employee_id OR user_has_role('ADMIN_TI') OR user_has_role('DIRECTOR_SEDE'));

-- Trigger para descontar vacaciones aprobadas
CREATE OR REPLACE FUNCTION handle_vacation_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APROBADO' AND OLD.status = 'PENDIENTE' THEN
        UPDATE employees
        SET vacation_days_available = vacation_days_available - NEW.days_requested,
            vacation_days_used = vacation_days_used + NEW.days_requested
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vacation_approved
    AFTER UPDATE ON vacation_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_vacation_update();
