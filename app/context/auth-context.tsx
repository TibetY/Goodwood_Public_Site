import { createContext, useContext, useEffect, useState } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

export type Role = 'site_admin' | 'event_admin';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    /** Roles from the signed-in user's profile row. Empty until loaded. */
    roles: Role[];
    /**
     * Convenience gate for the UI. This is COSMETIC ONLY — it hides controls the
     * user cannot use. Every privileged Netlify Function re-checks the role
     * server-side (netlify/shared/auth.ts); never remove those checks on the
     * grounds that the UI already hides the button.
     */
    hasRole: (role: Role) => boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    roles: [],
    hasRole: () => false,
    signOut: async () => { },
});

// Supabase persists the refresh token indefinitely and auto-refreshes the
// access token forever, so without this the portal stays signed in forever.
// We track our own login timestamp to enforce a hard session age cap.
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const LOGIN_TIMESTAMP_KEY = 'gw_session_login_at';

const getLoginTimestamp = (): number | null => {
    const raw = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    return raw ? Number(raw) : null;
};

const setLoginTimestamp = (ts: number) => {
    localStorage.setItem(LOGIN_TIMESTAMP_KEY, String(ts));
};

const clearLoginTimestamp = () => {
    localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<Role[]>([]);

    useEffect(() => {
        const applySession = (newSession: Session | null, event?: string) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);

            if (event === 'SIGNED_IN') {
                setLoginTimestamp(Date.now());
            } else if (event === 'SIGNED_OUT' || !newSession) {
                clearLoginTimestamp();
            } else if (getLoginTimestamp() === null) {
                // An already-persisted session with no tracked login time
                // (e.g. from before this change shipped, or a fresh page
                // load) — start the clock now rather than leaving it uncapped.
                setLoginTimestamp(Date.now());
            }
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            applySession(session);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            applySession(session, event);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load the signed-in user's own roles. The `profiles_select_own` RLS policy
    // (sql/001_roles.sql) is what makes this readable with the anon key, and it
    // scopes the read to this user's row only.
    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) {
            setRoles([]);
            return;
        }

        let cancelled = false;
        supabase
            .from('profiles')
            .select('roles')
            .eq('id', userId)
            .single()
            .then(({ data, error }) => {
                if (cancelled) return;
                if (error) {
                    // Not fatal — the user simply sees no privileged UI.
                    console.error('Failed to load profile roles:', error.message);
                    setRoles([]);
                    return;
                }
                setRoles((data?.roles ?? []) as Role[]);
            });

        return () => { cancelled = true; };
    }, [session?.user?.id]);

    useEffect(() => {
        if (!session) return;

        const checkExpiry = () => {
            const loginAt = getLoginTimestamp();
            if (loginAt !== null && Date.now() - loginAt > SESSION_MAX_AGE_MS) {
                clearLoginTimestamp();
                supabase.auth.signOut();
            }
        };

        checkExpiry();
        const interval = setInterval(checkExpiry, 60 * 1000);
        return () => clearInterval(interval);
    }, [session]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const hasRole = (role: Role) => roles.includes(role);

    return (
        <AuthContext.Provider value={{ user, session, loading, roles, hasRole, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};