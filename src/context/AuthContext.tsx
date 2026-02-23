import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchUserRole(session.user.id);
                } else {
                    setRole(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select(`
          roles (
            name
          )
        `)
                .eq('user_id', userId);

            if (!error && data && data.length > 0) {
                const fetchedRoles = data.map((r: any) => Array.isArray(r.roles) ? r.roles[0]?.name : r.roles?.name).filter(Boolean);

                const rolePriority = ['ADMIN_TI', 'RRHH', 'GERENCIA', 'DIRECTOR_SEDE', 'EMPLEADO'];
                let selectedRole = fetchedRoles[0];

                for (const rp of rolePriority) {
                    if (fetchedRoles.includes(rp)) {
                        selectedRole = rp;
                        break;
                    }
                }

                setRole(selectedRole || null);
            }
        } catch (err) {
            console.error('Error fetching role', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
